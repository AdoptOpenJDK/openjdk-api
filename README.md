# AdoptOpenJDK API

The AdoptOpenJDK API provides a way to consume JSON information about the AdoptOpenJDK releases and nightly builds.

Here is an example using `curl` (see the [curl documentation](https://curl.haxx.se/docs/tooldocs.html)):

```bash
curl https://api.adoptopenjdk.net/releases
```

This command returns information about all AdoptOpenJDK releases, and defaults to the latest version of the API.

Optionally, you can include an 'accept header' to specify a version of the API:
```bash
curl -H 'accept-version: 1.1.0' https://api.adoptopenjdk.net/releases
```

Sign up to the [mailing list](http://mail.openjdk.java.net/mailman/listinfo/adoption-discuss) where major API updates will be announced, and visit [adoptopenjdk.net](https://adoptopenjdk.net) to find out more about the community.

> **Note on the API rate limit:** Add the `-i` option (e.g. `curl -i https://api.adoptopenjdk.net/releases`) to return the response header as well as the response body. There is a limit of 100 API calls per hour per IP, and the value of `X-RateLimit-Remaining` in the response header is useful to determine how many API calls are remaining from this limit.

## v1.1.0

### New paths
In v1.1.0, you can directly download a binary, and specify a single release by its name.

|Path               |Returns  |
|-------------------|---------|
|[`/releases/<platform>/latest/binary`](https://api.adoptopenjdk.net/releases/x64_linux/latest/binary)|Redirects to the latest binary for the specified platform|
|[`/releases/all/<release-name>`](https://api.adoptopenjdk.net/releases/all/jdk8u152-b03)|One specified release, all platforms|
|[`/releases/<platform>/<release-name>`](https://api.adoptopenjdk.net/releases/x64_linux/jdk8u152-b03)|One specified release, one specified platform|
|[`/releases/<platform>/<release-name>/binary`](https://api.adoptopenjdk.net/releases/x64_linux/jdk8u152-b03/binary)|Redirects to the specified binary for the specified platform|

Example usage of the `/binary` path, to download the latest binary for Linux X64 with `curl`:

```bash
curl -OLJ https://api.adoptopenjdk.net/releases/x64_linux/latest/binary
```

Example release names:
`jdk8u162-b00`, `jdk8u152-b03`, `jdk8u152-b01`.

You can find more release names at [adoptopenjdk.net/archive](https://adoptopenjdk.net/archive.html).

## v1.0.0

### Paths
You can append the following paths to the `https://api.adoptopenjdk.net` URL, either in the above `curl` format, in a browser, or through an HTTP client, to return different JSON information:

|Path               |Returns  |
|-------------------|---------|
|[`/releases`](https://api.adoptopenjdk.net/releases)|All releases, all platforms.      |
|[`/releases/latest`](https://api.adoptopenjdk.net/releases/latest) |The latest release, all platforms.|
|[`/releases/<platform>`](https://api.adoptopenjdk.net/releases/x64_linux/)|All releases, one specified platform.|
|[`/releases/<platform>/latest`](https://api.adoptopenjdk.net/releases/x64_linux/latest)|The latest release, one specified platform.|
|[`/nightly`](https://api.adoptopenjdk.net/nightly/)|All nightly builds, all platforms.|
|[`/nightly/latest`](https://api.adoptopenjdk.net/nightly/latest)|The latest nightly build, all platforms.   |
|[`/nightly/<platform>`](https://api.adoptopenjdk.net/nightly/x64_linux)|All nightly builds, one specified platform.|
|[`/nightly/<platform>/latest`](https://api.adoptopenjdk.net/nightly/x64_linux/latest)|The latest nightly build, one specified platform.|

### Platforms
You can specify a platform by inserting one of the following names, in upper-case or lower-case, where you see `<platform>` in the path options:

|Platform |Route  |
|-------|---------|
| Linux - x64 |[`/x64_linux`](https://api.adoptopenjdk.net/releases/x64_linux/)|
| Mac - x64 |[`/x64_mac`](https://api.adoptopenjdk.net/releases/x64_mac/)|
| Windows - x64 |[`/x64_win`](https://api.adoptopenjdk.net/releases/x64_win/)|
| Linux - s390x |[`/s390x_linux`](https://api.adoptopenjdk.net/releases/s390x_linux)|
| Linux - ppc64le |[`/ppc64le_linux`](https://api.adoptopenjdk.net/releases/ppc64le_linux)|
| Linux - aarch64 |[`/aarch64_linux`](https://api.adoptopenjdk.net/releases/aarch64_linux)|
| AIX - ppc64 |[`/ppc64_aix`](https://api.adoptopenjdk.net/releases/ppc64_aix)|

### Additional options
By default, the API returns a pretty-printed JSON. You can disable this pretty-printing by appending `?pretty=false` to the end of any URL. For example:
```bash
curl https://api.adoptopenjdk.net/releases?pretty=false
```

### Examples
```bash
curl https://api.adoptopenjdk.net/nightly
curl https://api.adoptopenjdk.net/releases/latest?pretty=false
curl https://api.adoptopenjdk.net/nightly/x64_linux/latest
```
