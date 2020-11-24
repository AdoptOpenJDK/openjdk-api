const _ = require('underscore');
const rp = require('request-promise');

class GitHubFileCache {

  refreshCache(cache) {
    console.log('Refreshing cache at:', new Date());

    return _.chain(this.repos)
      .map(repo => this.getReleaseDataFromGithub(repo, cache))
      .value();
  }

  getInfoForVersion(version, releaseType, openjdkImpl) {

    if ( openjdkImpl ){
      const jvmImpl = openjdkImpl.toUpperCase()
      openjdkImpl = ` , jvmImpl: ${jvmImpl}`
    } else {
      openjdkImpl = ''
    }

    // Switch to V3 syntax
    switch (releaseType){
      case 'releases': releaseType = 'GA'
      break
      case 'nightly': releaseType = 'EA'
      break
    }

    version = version.replace(/\D/g,'');

    const options = {
      uri: "https://api.adoptopenjdk.net/graphql",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `query {
          v3AssetsFeatureReleases(vendor: ADOPTOPENJDK, featureVersion: ${version}, releaseType: ${releaseType}, sortOrder: DESC, pageSize: 50 ${openjdkImpl}) {
            releaseName
            releaseLink
            updatedAt
            downloadCount
            versionData {
              adoptBuildNumber
              build
              major
              minor
              openjdkVersion
              optional
              pre
              security
              semver
            }
            binaries {
              os
              architecture
              imageType
              jvmImpl
              heapSize
              downloadCount
              updatedAt
              package {
                name
                link
                checksumLink
                size
                downloadCount
              }
              installer {
                name
                link
                checksumLink
                size
                downloadCount
              }
            }
          }
        }`
      })
    }

    return rp(options)
    .catch(function (err) {
      console.error("failed to get: ", err);
      return [];
    })
  }
}

module.exports = GitHubFileCache;
