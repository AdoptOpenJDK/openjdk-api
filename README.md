# AdoptOpenJDK API

The AdoptOpenJDK API provides a way to consume JSON information about the AdoptOpenJDK releases and nightly builds.

Here is an example using `curl` (see the [curl documentation](https://curl.haxx.se/docs/tooldocs.html)):

```bash
curl https://api.adoptopenjdk.net/openjdk/releases
```

This command returns information about all 'OpenJDK' releases, and defaults to the latest version of the API.

Optionally, you can include an 'accept header' to specify a version of the API:
```bash
curl -H 'accept-version: 1.0.0' https://api.adoptopenjdk.net/openjdk/releases
```

Sign up to the [mailing list](http://mail.openjdk.java.net/mailman/listinfo/adoption-discuss) where major API updates will be announced, and visit [adoptopenjdk.net](https://adoptopenjdk.net) to find out more about the community.

> **Note on the API rate limit:** Add the `-i` option (e.g. `curl -i https://api.adoptopenjdk.net/openjdk/releases`) to return the response header as well as the response body. There is a limit of 100 API calls per hour per IP, and the value of `X-RateLimit-Remaining` in the response header is useful to determine how many API calls are remaining from this limit.

## API v1.0.0

You can append different paths to the `https://api.adoptopenjdk.net` URL, either in the above `curl` format, in a browser, or through an HTTP client, to return different JSON information:

```
/<variant>/<build type>/<platform>/<build>/<data type>
```

There are default values for all values in this path, with the exception of `<variant>`, which must be specified. These default values are as follows:

```
/<variant>/releases/allplatforms/allbuilds/info
```

This means that each of the following paths all return the same result (information about all builds, all platforms, of the 'release' build type):

- `/openjdk`
- `/openjdk/releases`
- `/openjdk/releases/allplatforms`
- `/openjdk/releases/allplatforms/allbuilds`
- `/openjdk/releases/allplatforms/allbuilds/info`

However, if you need to specify `<build>` as `latest`, for instance, then you also need to specify `<build type>` and `<platform>` prior to that, even if you are using the default values:

```
/openjdk/releases/allplatforms/latest
```

### Path options

|Variant |Example (click to view) |
|--------|--------|
|`openjdk` |[`/openjdk`](https://api.adoptopenjdk.net/openjdk) |

> **Note on 'variant':** currently, there is only one 'variant': `openjdk`. In the future, this will expand with further options, such as future versions of OpenJDK.

|Build Type |Example (click to view) |
|-----------|--------|
|`releases` (DEFAULT) |[`/openjdk/releases`](https://api.adoptopenjdk.net/openjdk/releases) |
|`nightly` |[`/openjdk/nightly`](https://api.adoptopenjdk.net/openjdk/nightly) |

|Platform |Example (click to view) |
|-----------|--------|
|`allplatforms` (DEFAULT) |[`/openjdk/releases/allplatforms`](https://api.adoptopenjdk.net/openjdk/releases/allplatforms) |
|`x64_linux` |[`/openjdk/releases/x64_linux`](https://api.adoptopenjdk.net/openjdk/releases/x64_linux) |
|`x64_mac` |[`/openjdk/releases/x64_mac`](https://api.adoptopenjdk.net/openjdk/releases/x64_mac) |
|`x64_win` |[`/openjdk/releases/x64_win`](https://api.adoptopenjdk.net/openjdk/releases/x64_win) |
|`s390x_linux` |[`/openjdk/releases/s390x_linux`](https://api.adoptopenjdk.net/openjdk/releases/s390x_linux) |
|`ppc64le_linux` |[`/openjdk/releases/ppc64le_linux`](https://api.adoptopenjdk.net/openjdk/releases/ppc64le_linux) |
|`aarch64_linux` |[`/openjdk/releases/aarch64_linux`](https://api.adoptopenjdk.net/openjdk/releases/aarch64_linux) |
|`ppc64_aix` |[`/openjdk/releases/ppc64_aix`](https://api.adoptopenjdk.net/openjdk/releases/ppc64_aix) |

|Build |Example (click to view) |
|-----------|--------|
|`allbuilds` (DEFAULT) |[`/openjdk/releases/x64_linux/allbuilds`](https://api.adoptopenjdk.net/openjdk/releases/x64_linux/allbuilds) |
|`latest` |[`/openjdk/releases/x64_linux/latest`](https://api.adoptopenjdk.net/openjdk/releases/x64_linux/latest) |
|`<build number>` |[`/openjdk/releases/x64_linux/jdk8u152-b03`](https://api.adoptopenjdk.net/openjdk/releases/x64_linux/jdk8u152-b03) |

> **Note on build numbers:** You can find more 'release' build numbers at [adoptopenjdk.net/archive](https://adoptopenjdk.net/archive.html).
To specify a 'nightly' build number, go to [adoptopenjdk.net/nightly](https://adoptopenjdk.net/nightly.html) and click on the build number. This will take you to a GitHub page which contains the full, unique Nightly build number, e.g. `jdk8u162-b00-20171207`.

|Data Type |Example (click to view) |
|-----------|--------|
|`info` (DEFAULT) |[`/openjdk/releases/x64_linux/latest/info`](https://api.adoptopenjdk.net/openjdk/releases/x64_linux/latest/info) |
|`binary` (Redirects to download) |[`/openjdk/releases/x64_linux/latest/binary`](https://api.adoptopenjdk.net/openjdk/releases/x64_linux/latest/binary) |

> **Note on the `/binary` path:** you must specify a single platform and a single build before you can use `/binary`.

Example usage of the `/binary` path, to download the latest binary for Linux X64 with `curl`:

```bash
curl -OLJ https://api.adoptopenjdk.net/openjdk/releases/x64_linux/latest/binary
```

### Additional path options
By default, the API returns a pretty-printed JSON. You can disable this pretty-printing by appending `?pretty=false` to the end of any URL. For example:
```bash
curl https://api.adoptopenjdk.net/openjdk/releases?pretty=false
```
