var exports = module.exports = {};

exports.platforms = function(){
  var platforms =
    [
      {
        officialName: "Linux x64",
        searchableName: "X64_LINUX",
        logo: "linux.png",
        binaryExtension: ".tar.gz",
        installerExtension: "no-installer-available",
        architecture: "64",
        osDetectionString: "Linux Mint Debian Fedora FreeBSD Gentoo Haiku Kubuntu OpenBSD Red Hat RHEL SuSE Ubuntu Xubuntu hpwOS webOS Tizen"
      },
      {
        officialName: "Windows x64",
        searchableName: "X64_WIN",
        logo: "windows.png",
        binaryExtension: ".zip",
        installerExtension: ".exe",
        architecture: "64",
        osDetectionString: "Windows Win Cygwin"
      },
      {
        officialName: "macOS x64",
        searchableName: "X64_MAC",
        logo: "mac.png",
        binaryExtension: ".tar.gz",
        installerExtension: ".dmg",
        architecture: "64",
        osDetectionString: "Mac OS X OSX macOS Macintosh"
      },
      {
        officialName: "Linux s390x",
        searchableName: "S390X_LINUX",
        logo: "s390x.png",
        binaryExtension: ".tar.gz",
        installerExtension: "no-installer-available",
        architecture: "64",
        osDetectionString: "not-to-be-detected"
      },
      {
        officialName: "Linux ppc64le",
        searchableName: "PPC64LE_LINUX",
        logo: "ppc64le.png",
        binaryExtension: ".tar.gz",
        installerExtension: "no-installer-available",
        architecture: "64",
        osDetectionString: "not-to-be-detected"
      },
      {
        officialName: "Linux aarch64",
        searchableName: "AARCH64_LINUX",
        logo: "arm.png",
        binaryExtension: ".tar.gz",
        installerExtension: "no-installer-available",
        architecture: "64",
        osDetectionString: "not-to-be-detected"
      }
    ];

  return platforms;
}
