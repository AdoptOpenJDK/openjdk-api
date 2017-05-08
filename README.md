# AdoptOpenJDK API

The AdoptOpenJDK API provides a way to consume JSON information about the AdoptOpenJDK releases and nightly builds.

We recommend that you use `curl` (see the [curl documentation](https://curl.haxx.se/docs/tooldocs.html)), and include an 'accept header' to specify a version of the API. This will ensure consistency when future versions of the API are announced.

For example, the following command specifies **v1.0.0** of the API and returns information about all AdoptOpenJDK releases:

```
curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/releases
```

However, you should periodically check back here to see if new API developments could benefit your project!

## v1.0.0

### Paths
You can append the following paths to the `api.adoptopenjdk.net` URL, either in the above `curl` format or in a browser, to return different JSON information:

|Path               |Returns  |
|-------------------|---------|
|`/releases`          |All releases, all platforms.      |
|`/releases/latest`   |The latest release, all platforms.|
|`/nightly`           |All nightly builds, all platforms.|
|`/nightly/latest`    |The latest nightly build, all platforms.   |
|`/nightly/<platform>`|All nightly builds, one specified platform.|
|`/nightly/<platform>/latest`|The latest nightly build, one specified platform.|

### Platforms
You can specify a platform by inserting one of the following names, in upper-case or lower-case, where you see `<platform>` in the path options:

- `x64_linux`
- `x64_mac`
- `s390x_linux`
- `ppc64le_linux`

### Additional options
By default, the API returns a pretty-printed JSON. You can disable this pretty-printing by appending `?pretty=false` to the end of any URL. For example:
```
curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/releases?pretty=false
```

### Examples
```
curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/nightly
curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/releases/latest?pretty=false
curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/nightly/x64_linux/latest
```
