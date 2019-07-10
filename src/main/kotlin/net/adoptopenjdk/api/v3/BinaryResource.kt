package net.adoptopenjdk.api.v3

import net.adoptopenjdk.api.v3.models.*
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.media.Schema
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import org.jboss.resteasy.annotations.jaxrs.PathParam
import java.net.URI
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.Produces
import javax.ws.rs.core.MediaType
import javax.ws.rs.core.Response


@Tag(name = "Binary")
@Path("/v3/binary/")
@Produces(MediaType.APPLICATION_JSON)
class BinaryResource {

    @GET
    @Path("{release_type}/{version}/{os}/{arch}/{release_name}/{binary_type}/{jvm_impl}/{heap_size}")
    @Produces("application/octet-stream")
    @Operation(summary = "Redirects to the binary that matches your current query", description = "Redirects to the binary that matches your current query")
    @APIResponses(value = [
        APIResponse(responseCode = "302", description = "link to binary that matches your current query"),
        APIResponse(responseCode = "400", description = "bad input parameter")
    ])
    fun returnBinary(
            @Parameter(name = "release_type", description = "Release type", required = true,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/ReleaseType"))
            @PathParam("release_type")
            release_type: ReleaseType?,

            @Parameter(name = "version", description = "Feature release version", required = true)
            @PathParam("version")
            version: Int?,

            @Parameter(name = "os", description = "Operating System", required = true,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/OperatingSystem"))
            @PathParam("os")
            os: OperatingSystem?,

            @Parameter(name = "arch", description = "Architecture", required = true,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/Architecture"))
            @PathParam("arch")
            arch: Architecture?,

            @Parameter(name = "release_name", description = "Release e.g latest, jdk8u172-b00-201807161800", required = true)
            @PathParam("release_name")
            release_name: String?,

            @Parameter(name = "binary_type", description = "Binary Type", required = true,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/BinaryType"))
            @PathParam("binary_type")
            binary_type: BinaryType?,

            @Parameter(name = "jvm_impl", description = "OpenJDK Implementation", required = true,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/JvmImpl"))
            @PathParam("jvm_impl")
            jvm_impl: JvmImpl?,

            @Parameter(name = "heap_size", description = "Heap Size", required = true,
                    schema = Schema(ref = "#/components/schemas/ApiEnums/properties/HeapSize"))
            @PathParam("heap_size")
            heap_size: HeapSize?
    ): Response {
        return Response.status(Response.Status.FOUND).location(URI.create("resource/location")).build()
    }
}
