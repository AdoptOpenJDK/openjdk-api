package net.adoptopenjdk.api.v3

import net.adoptopenjdk.api.v3.models.*
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType
import org.eclipse.microprofile.openapi.annotations.media.Content
import org.eclipse.microprofile.openapi.annotations.media.Schema
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses
import org.jboss.resteasy.annotations.jaxrs.PathParam
import org.jboss.resteasy.annotations.jaxrs.QueryParam
import java.time.LocalDateTime
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.Produces
import javax.ws.rs.core.MediaType


@Path("/v3/info/")
@Produces(MediaType.APPLICATION_JSON)
class InfoResource {

    @GET
    @Path("{release_type}/{version}")
    @Operation(summary = "Returns release information", description = "List of information about builds that match the current query ")
    @APIResponses(value = [
        APIResponse(responseCode = "200", description = "search results matching criteria",
                content = [Content(schema = Schema(type = SchemaType.ARRAY, implementation = Info::class))]
        ),
        APIResponse(responseCode = "400", description = "bad input parameter",
                content = [Content(schema = Schema(implementation = Void::class))])
    ])
    fun get(
            @Parameter(name = "release_type", description = "Release type", required = true,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/ReleaseType"))
            @PathParam("release_type")
            release_type: ReleaseType?,

            @Parameter(name = "version", description = "Feature release version", required = true)
            @PathParam("version")
            version: Int?,

            @Parameter(name = "os", description = "Operating System", required = false,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/OperatingSystem"))
            @QueryParam("os")
            os: OperatingSystem?,

            @Parameter(name = "arch", description = "Architecture", required = false,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/Architecture"))
            @QueryParam("arch")
            arch: Architecture?,

            @Parameter(name = "release", description = "Release e.g latest, jdk8u172-b00-201807161800", required = false,
                    schema = Schema(defaultValue = "latest"))
            @QueryParam("release")
            release: String?,

            @Parameter(name = "type", description = "Binary Type", required = false,
                    schema = Schema(defaultValue = "jdk", ref = "#/components/schemas/ApiEnums/properties/BinaryType", required = false))
            @QueryParam("type")
            type: BinaryType?,

            @Parameter(name = "jvm_impl", description = "OpenJDK Implementation", required = false,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/JvmImpl"))
            @QueryParam("jvm_impl")
            jvm_impl: JvmImpl?,

            @Parameter(name = "heap_size", description = "Heap Size", required = false,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/HeapSize"))
            @QueryParam("heap_size")
            heap_size: HeapSize?,

            @Parameter(name = "vendor", description = "Vendor", required = false,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/Vendor"))
            @QueryParam("vendor")
            vendor: Vendor?

    ): List<Info> {

        if (release_type == null || version == null) {
            throw IllegalArgumentException("Unrecognised type")
        }

        return listOf(Info(release_type.name, "", "", LocalDateTime.now(), listOf<Binary>(), 1, Vendor.adopt.name, VersionData(1, 2, "pre", 4, 5, "a", 6, "opt", "")))
    }


}