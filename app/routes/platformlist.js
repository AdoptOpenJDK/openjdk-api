var exports = module.exports = {};

exports.platforms = function(){
  var platforms =
    [
      {
        officialName: "Linux x86-64",
        searchableName: "X64_LINUX",
        logo: "linux.png",
        fileExtension: ".tar.gz",
        requirements: "GLIBC 2.5 and above",
        architecture: "64",
        osDetectionString: "Linux Mint Debian Fedora FreeBSD Gentoo Haiku Kubuntu OpenBSD Red Hat RHEL SuSE Ubuntu Xubuntu hpwOS webOS Tizen"
      },
      {
        officialName: "Linux s390x",
        searchableName: "S390X_LINUX",
        logo: "s390x.png",
        fileExtension: ".tar.gz",
        requirements: "GLIBC 2.5 and above",
        architecture: "64",
        osDetectionString: "not-to-be-detected"
      },
      {
        officialName: "Linux ppc64le",
        searchableName: "PPC64LE_LINUX",
        logo: "ppc64le.png",
        fileExtension: ".tar.gz",
        requirements: "GLIBC 2.5 and above",
        architecture: "64",
        osDetectionString: "not-to-be-detected"
      },
      {
        officialName: "Linux arm64",
        searchableName: "ARM64_LINUX",
        logo: "arm.png",
        fileExtension: ".tar.gz",
        requirements: "GLIBC 2.5 and above",
        architecture: "64",
        osDetectionString: "not-to-be-detected"
      },
      /*{
        officialName: "Windows x86-64",
        searchableName: "WIN",
        logo: "windows.png",
        fileExtension: ".zip",
        requirements: "VS 2010 and above",
        architecture: "64",
        osDetectionString: "Windows Win Cygwin"
      }*/
      {
        officialName: "macOS x86-64",
        searchableName: "X64_MAC",
        logo: "mac.png",
        fileExtension: ".tar.gz",
        requirements: "macOS 10.8 and above",
        architecture: "64",
        osDetectionString: "Mac OS X OSX macOS Macintosh"
      }
    ];

  return platforms;
}
