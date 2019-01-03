const _ = require('underscore');
const versions = require('../app/routes/versions')();

describe('parses versions correctly', () => {
    
    const versionMappings = {
      "jdk-11.2.1+10":              "11.2.1+10",
      "9-ea+19":                    "9.0.0-ea+19",
      "jdk-9+181":                  "9.0.0+181",
      "jdk-11+28":                  "11.0.0+28",
      "jdk-10.0.1+10":              "10.0.1+10",
      "jdk-9.0.4+12_openj9-0.9.0":  "9.0.4+12",
      "jdk-11+28":                  "11.0.0+28",
      "jdk-11.0.1+13":              "11.0.1+13",
      "jdk-10.0.2+13_openj9-0.9.0": "10.0.2+13",
      "jdk8u162-b12_openj9-0.8.0":  "8.0.162+12",
      "jdk8u172-b11":               "8.0.172+11",
      "jdk-9-ea+73":                "9.0.0-ea+73",
      "jdk-9.0.1-ea+73":            "9.0.1-ea+73",

      "rubbish":                    undefined,
      "jdk8-rubbish":               undefined,
    };

    _.each(versionMappings, function(expected, version) {
      test(version + " parses to " + expected, function () {
        expect(versions.formAdoptApiVersionObject(version).semver).toEqual(expected)
      });
    })
});
