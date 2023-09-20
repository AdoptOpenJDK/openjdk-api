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

    if (openjdkImpl) {
      openjdkImpl = ` , jvmImpl: "${openjdkImpl}"`
    } else {
      openjdkImpl = ''
    }

    // Switch to V3 syntax
    switch (releaseType){
      case 'releases': releaseType = 'ga'
      break
      case 'nightly': releaseType = 'ea'
      break
    }
    // Strips all non numeric characters from version e.g openjdk8 => 8
    version = version.replace(/\D/g,'');

    const generatedQuery = `query {
      v3AssetsFeatureReleases(vendor: "adoptopenjdk", featureVersion: ${version}, releaseType: "${releaseType}", sortOrder: "DESC", pageSize: 50 ${openjdkImpl}) {
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

    const options = {
      uri: "https://api.adoptopenjdk.net/graphql",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: generatedQuery
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
