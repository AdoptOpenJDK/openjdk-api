// Version string is defined in:
// http://openjdk.java.net/jeps/322
// http://openjdk.java.net/jeps/223
// For consistency we transform java 8 strings into the 223 format

// 233 Format
// ==========
// VNUM=$MAJOR.$MINOR.$SECURITY
//   Note that $MINOR and $SECURITY can and are omitted if they are 0, i.e "9" is a valid VNUM rather than 9.0.0

// VERSION_STRING=
//                    $VNUM(-$PRE)?\+$BUILD(-$OPT)?
//                        OR
//                    $VNUM-$PRE(-$OPT)?
//                        OR
//                    $VNUM(+-$OPT)?
//

// Examples:
//                 Existing                Proposed
// Release Type    long           short    long           short
// ------------    --------------------    --------------------
// Early Access    1.9.0-ea-b19    9-ea    9-ea+19        9-ea
// Major           1.9.0-b100      9       9+100          9
// Security #1     1.9.0_5-b20     9u5     9.0.1+20       9.0.1
// Security #2     1.9.0_11-b12    9u11    9.0.2+12       9.0.2
// Minor #1        1.9.0_20-b62    9u20    9.1.2+62       9.1.2
// Security #3     1.9.0_25-b15    9u25    9.1.3+15       9.1.3
// Security #4     1.9.0_31-b08    9u31    9.1.4+8        9.1.4
// Minor #2        1.9.0_40-b45    9u40    9.2.4+45       9.2.4
//

// Examples:
//
// jdk-11+28
// jdk-10.0.1+10
// jdk-9+181
// jdk8u162-b12_openj9-0.8.0
//

const _ = require('underscore');

module.exports = function () {

  //Regexes based on those in http://openjdk.java.net/jeps/223
  // Technically the standard supports an arbitrary number of numbers, we will support 3 for now
  const vnumRegex = '(?<major>[0-9]+)(\\.(?<minor>[0-9]+))?(\\.(?<security>[0-9]+))?';
  const pre = '(?<pre>[a-zA-Z0-9]+)';
  const build = '(?<build>[0-9]+)';
  const opt = '(?<opt>[-a-zA-Z0-9\\.]+)';

  const version223Regexs = [
                          new RegExp(`(?<version>${vnumRegex}(\\-${pre})?\\+${build}(\\-${opt})?)`),
                          new RegExp(`(?<version>${vnumRegex}\\-${pre}(\\-${opt})?)`),
                          new RegExp(`(?<version>${vnumRegex}(\\+\\-${opt})?)`)
  ];

  const pre223regex = new RegExp('jdk(?<version>(?<major>[0-8]+)(u(?<update>[0-9]+))?(-b(?<build>[0-9]+))(_(?<opt>[-a-zA-Z0-9\\.]+))?)');

  function or0(x) {
    return x === undefined ? 0 : parseInt(x);
  }

  function toInt(x) {
    return x === undefined ? undefined : parseInt(x);
  }

  function removeUndefined(data) {
    return _.omit(data, _.filter(_.keys(data), function (key) {
      return _.isUndefined(data[key])
    }))
  }

  function parse223VersionString(versionNumber) {

    let matched = null;
    let index = 0;

    while (matched == null && index < version223Regexs.length) {
      matched = versionNumber.match(version223Regexs[index]);
      index++;
    }

    if (matched != null) {
      return {
        major: parseInt(matched.groups.major),
        minor: or0(matched.groups.minor),
        security: or0(matched.groups.security),
        pre: matched.groups.pre,
        build: toInt(matched.groups.build),
        opt: matched.groups.opt,
        version: matched.groups.version
      }
    } else {
      return null;
    }
  }

  function parsePre223VersionString(versionNumber) {

    let matched = versionNumber.match(pre223regex);

    if (matched != null) {
      matched = versionNumber.match(pre223regex);

      return {
        major: parseInt(matched.groups.major),
        minor: 0,
        security: or0(matched.groups.update),
        build: toInt(matched.groups.build),
        opt: matched.groups.opt,
        version: matched.groups.version
      }
    } else {
      return null;
    }
  }

  function parseVersionString(versionNumber) {
      if(versionNumber.match(/^jdk[1-8]/)) {
        return parsePre223VersionString(versionNumber)
      } else {
        return parse223VersionString(versionNumber)
      }
  }

  function formAdoptApiVersionObject(versionNumber) {

    const parsed = parseVersionString(versionNumber);

    if (parsed === null) {
      return {
        openjdk_version: versionNumber
      }
    }

    var semver = parsed.major + "." + parsed.minor + "." + parsed.security;

    if (parsed.pre) {
      semver += "-" + parsed.pre;
    }

    if (parsed.build) {
      semver += "+" + parsed.build;
    }

    const adoptVersion = {
      openjdk_version: parsed.version,
      semver: semver,
      optional: parsed.opt,
      preview: parsed.pre,
    };

    return removeUndefined(adoptVersion);
  }

  return {
    formAdoptApiVersionObject: formAdoptApiVersionObject
  };
};

