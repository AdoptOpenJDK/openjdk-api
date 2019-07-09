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
    x64, x32, ppc64, ppc64le, s390x, aarch64, arm;
}


@Schema(type = SchemaType.STRING)
enum class ReleaseType {
    releases,
    nightly;
}

@Schema(type = SchemaType.STRING, example = "openjdk8, openjdk9")
enum class ReleaseVersion(val featureNumber: Int) {
    openjdk8(8),
    openjdk9(9),
    openjdk10(10),
    openjdk11(11),
    openjdk12(12),
    openjdk13(13);

}

@Schema(type = SchemaType.STRING)
enum class JvmImpl {
    hotspot, openj9;
}

@Schema(type = SchemaType.STRING)
enum class HeapSize {
    normal, large;
}

@Schema(type = SchemaType.STRING)
enum class Vendor {
    adopt, ibm, redhat, azul, amazon;
}

@Schema(hidden = true)
class ApiEnums {
    val ReleaseVersion: ReleaseVersion? = null
    val Architecture: Architecture? = null
    val OperatingSystem: OperatingSystem? = null
    val ReleaseType: ReleaseType? = null
    val BinaryType: BinaryType? = null
    val JvmImpl: JvmImpl? = null
    val HeapSize: HeapSize? = null
    val Vendor: Vendor? = null
}