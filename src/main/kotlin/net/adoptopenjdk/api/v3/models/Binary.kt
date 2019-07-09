package net.adoptopenjdk.api.v3.models

import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.time.LocalDateTime

class Binary {

    @Schema(example = "linux", required = true)
    val os: String

    @Schema(example = "x64", required = true)
    val architecture: String

    @Schema(example = "jdk", required = true)
    val binary_type: String

    @Schema(example = "openj9", required = true)
    val jvm_impl: String

    @Schema(example = "OpenJDK8-OPENJ9_x64_Linux_jdk8u162-b12_openj9-0.8.0.tar.gz", required = true)
    val binary_name: String

    @Schema(example = "https://github.com/AdoptOpenJDK/openjdk8-openj9-releases/releases/download/jdk8u162-b12_openj9-0.8.0/OpenJDK8-OPENJ9_x64_Linux_jdk8u162-b12_openj9-0.8.0.tar.gz", required = true)
    val binary_link: String

    @Schema(example = "82573385", required = true)
    val binary_size: Int

    @Schema(example = "dd28d6d2cde2b931caf94ac2422a2ad082ea62f0beee3bf7057317c53093de93", required = true)
    val checksum: String

    @Schema(example = "https://github.com/AdoptOpenJDK/openjdk8-openj9-releases/releases/download/jdk8u162-b12_openj9-0.8.0/OpenJDK8-OPENJ9_x64_Linux_jdk8u162-b12_openj9-0.8.0.tar.gz.sha256.txt", required = true)
    val checksum_link: String

    @Schema(example = "normal", required = true)
    val heap_size: String

    @Schema(example = "3899", required = true)
    val download_count: Int

    @Schema(example = "2018-03-15T12:13:07.000Z", required = true)
    val updated_at: LocalDateTime

    @Schema(example = "dd28d6d2cde2b931caf94ac2422a2ad082ea62f0beee3bf7057317c53093de93")
    val scm_ref: String

    constructor(
            os: String,
            architecture: String,
            binary_type: String,
            jvm_impl: String,
            binary_name: String,
            binary_link: String,
            binary_size: Int,
            checksum: String,
            checksum_link: String,
            heap_size: String,
            download_count: Int,
            updated_at: LocalDateTime,
            scm_ref: String) {
        this.os = os
        this.architecture = architecture
        this.binary_type = binary_type
        this.jvm_impl = jvm_impl
        this.binary_name = binary_name
        this.binary_link = binary_link
        this.binary_size = binary_size
        this.checksum = checksum
        this.checksum_link = checksum_link
        this.heap_size = heap_size
        this.download_count = download_count
        this.updated_at = updated_at
        this.scm_ref = scm_ref
    }
}
