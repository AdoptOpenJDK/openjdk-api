# AdoptOpenJDK API

For v1 docs see: [README.v1.md](README.v1.md)

The AdoptOpenJDK API provides a way to consume JSON information about the AdoptOpenJDK releases and nightly builds.  Sign up to the [mailing list](http://mail.openjdk.java.net/mailman/listinfo/adoption-discuss) where major API updates will be announced, and visit [adoptopenjdk.net](https://adoptopenjdk.net) to find out more about the community.

## Usage

Here is an example using `curl` (see the [curl documentation](https://curl.haxx.se/docs/tooldocs.html)):

```bash
curl https://api.adoptopenjdk.net/v2/releases/openjdk8
```

This command returns information about all 'OpenJDK' releases, and defaults to the latest version of the API.

The following [Windows Powershell](https://docs.microsoft.com/en-us/powershell/scripting/getting-started/getting-started-with-windows-powershell?view=powershell-6) script uses `Invoke-Webrequest` to download the latest Windows 64-bit archive.
```
function Get-RedirectedUrl
{
    Param (
        [Parameter(Mandatory=$true)]
        [String]$URL
    )

    $request = [System.Net.WebRequest]::Create($url)
    $request.AllowAutoRedirect=$false
    $response=$request.GetResponse()

    If ($response.StatusCode -eq "Found")
    {
        $response.GetResponseHeader("Location")
    }
}

$url= "https://api.adoptopenjdk.net/v2/binary/nightly/openjdk8?openjdk_impl=hotspot&os=windows&arch=x64&release=latest&type=jdk"

$fUrl = Get-RedirectedUrl $url
$filename = [System.IO.Path]::GetFileName($fUrl); 

Write-Host "Downloading $filename"

[Net.ServicePointManager]::SecurityProtocol = "tls12, tls11, tls"
Invoke-WebRequest -Uri $url -OutFile $filename
```

> **Note on the API rate limit:** Add the `-i` option (e.g. `curl -i https://api.adoptopenjdk.net/v2/openjdk8/releases`) to return the response header as well as the response body. There is a limit of 100 API calls per hour per IP, and the value of `X-RateLimit-Remaining` in the response header is useful to determine how many API calls are remaining from this limit.

## API v2.0.0 Specification

You can append different paths to the `https://api.adoptopenjdk.net/v2/` URL, either in the above `curl` format, in a browser, or through an HTTP client, to return different JSON information:

```
/v2/<request type>/<release type>/<version>
```

For instance:

```
/info/latest/openjdk10
curl https://api.adoptopenjdk.net/v2/info/nightly/openjdk10
```

### Path Parameters

#### Request Type

##### info

List of information about builds that match the current query

```
curl https://api.adoptopenjdk.net/v2/info/nightly/openjdk8?openjdk_impl=hotspot
```

##### binary
Redirects to the binary that matches your current query. If multiple or no binarys match the query, an error code will be returned

```
curl https://api.adoptopenjdk.net/v2/binary/nightly/openjdk8?openjdk_impl=hotspot&os=windows&arch=x64&release=latest&type=jdk
```

#### Release Type

Type of release, i.e `releases` for stable builds or `nightly` for most recent build.

#### Version

OpenJDK version, i.e `openjdk8`, `openjdk9`, `openjdk10`.

### Query Parameters

The data that can be returned can then be filtered to find builds of a specific type

| Parameter | Query Parameter Name | Examples |
|-----------|----------------------|----------|
| Open Jdk Implementation | openjdk_impl | hotspot, openj9 |
| Operating System | os | windows, linux, mac |
| Architecture | arch | x64, x32, ppc64, s390x, ppc64le, aarch64 |
| Release | release | latest, jdk8u172-b00-201807161800 |
| Binary Type | type | jdk, jre |

In the absence of a given parameter, it will return all elements. 

To return latest, hotspot, windows, x64, jdk:
```
curl https://api.adoptopenjdk.net/v2/binary/nightly/openjdk8?openjdk_impl=hotspot&os=windows&arch=x64&release=latest&type=jdk
```
