# AdoptOpenJDK API

The AdoptOpenJDK API provides a way to consume JSON information about the AdoptOpenJDK releases and nightly builds.

Here is an example using `curl` (see the [curl documentation](https://curl.haxx.se/docs/tooldocs.html)). This command returns information about all AdoptOpenJDK releases, and includes an 'accept header' to specify **v1.0.0** of the API. This will ensure consistency when future versions of the API are announced.

```bash
curl -H 'accept-version: 1.0.0' https://api.adoptopenjdk.net/releases
```

However, new API developments could benefit your project! Sign up to the [mailing list](http://mail.openjdk.java.net/mailman/listinfo/adoption-discuss) where API updates will be announced, and visit [adoptopenjdk.net](https://adoptopenjdk.net) to find out more about the community.

> **Note on the API rate limit:** Add the `-i` option (e.g. `curl -i -H 'accept-version: 1.0.0' https://api.adoptopenjdk.net/releases`) to return the response header as well as the response body. There is a limit of 100 API calls per hour per IP, and the value of `X-RateLimit-Remaining` in the response header is useful to determine how many API calls are remaining from this limit.

## v1.0.0

### Paths
You can append the following paths to the `https://api.adoptopenjdk.net` URL, either in the above `curl` format, in a browser, or through an HTTP client, to return different JSON information:

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


|Platform |Route  |
|-------|---------|
| Linux - x64 |`/x64_linux`|
| Mac - x64 |`/x64_mac`|
| Windows - x64 |`/x64_win`|
| Linux - s390x |`/s390x_linux`|
| Linux - ppc64le | `/ppc64le_linux` |
| Linux - aarch64 |`/aarch64_linux`|

### Additional options
By default, the API returns a pretty-printed JSON. You can disable this pretty-printing by appending `?pretty=false` to the end of any URL. For example:
```bash
curl -H 'accept-version: 1.0.0' https://api.adoptopenjdk.net/releases?pretty=false
```

### Examples
```bash
curl -H 'accept-version: 1.0.0' https://api.adoptopenjdk.net/nightly
curl -H 'accept-version: 1.0.0' https://api.adoptopenjdk.net/releases/latest?pretty=false
curl -H 'accept-version: 1.0.0' https://api.adoptopenjdk.net/nightly/x64_linux/latest
```
