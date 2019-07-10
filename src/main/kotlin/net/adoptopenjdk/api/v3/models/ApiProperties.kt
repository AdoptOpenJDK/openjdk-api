package net.adoptopenjdk.api.v3.models

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType
import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(type = SchemaType.STRING, example = "jdk")
enum class BinaryType {
    jdk, jre;
}

@Schema(type = SchemaType.STRING)
enum class OperatingSystem {
    linux, windows, mac, solaris;
}

@Schema(type = SchemaType.STRING)
enum class Architecture {
    x64, x32, ppc64, ppc64le, s390x, aarch64, arm, sparcv9;
}

@Schema(type = SchemaType.STRING)
enum class JvmImpl {
    hotspot, openj9;
}

@Schema(defaultValue = "normal", type = SchemaType.STRING)
enum class HeapSize {
    normal, large;
}

@Schema(type = SchemaType.STRING)
enum class Vendor {
    adopt, ibm, redhat, azul, amazon;
}

@Schema(type = SchemaType.STRING, defaultValue = "releases", ref = "#/components/schemas/ReleaseType")
enum class ReleaseType {
    releases,
    nightly;
}


@Schema(hidden = true)
class ApiProperties {
    val Architecture: Architecture? = null
    val OperatingSystem: OperatingSystem? = null
    val BinaryType: BinaryType? = null
    val JvmImpl: JvmImpl? = null
    val HeapSize: HeapSize? = null
    val Vendor: Vendor? = null
    val ReleaseType: ReleaseType? = null;
}