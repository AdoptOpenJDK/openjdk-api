package net.adoptopenjdk.api.v3.models

import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.time.LocalDateTime


class Info {
    @Schema(example = "https://github.com/AdoptOpenJDK/openjdk8-openj9-releases/releases/tag/jdk8u162-b12_openj9-0.8.0", required = true)
    val release_link: String;

    @Schema(example = "jdk8u162-b12_openj9-0.8.0", required = true)
    val release_name: String;

    @Schema(example = "2018-03-15T12:12:35.000Z", required = true)
    val timestamp: LocalDateTime;

    @Schema(required = true, implementation = Binary::class)
    val binaries: List<Binary>;

    @Schema(example = "7128", required = true)
    val download_count: Int;

    @Schema(example = "release", required = true)
    val release_type: String;

    @Schema(example = "adopt", ref = "#/components/schemas/ApiEnums/properties/Vendor")
    val vendor: String;

    val version_data: VersionData;

    constructor(release_type: String, release_link: String, release_name: String, timestamp: LocalDateTime, binaries: List<Binary>, download_count: Int, vendor: String, version_data: VersionData) {
        this.release_type = release_type;
        this.release_link = release_link
        this.release_name = release_name
        this.timestamp = timestamp
        this.binaries = binaries
        this.download_count = download_count
        this.vendor = vendor
        this.version_data = version_data
    }

}