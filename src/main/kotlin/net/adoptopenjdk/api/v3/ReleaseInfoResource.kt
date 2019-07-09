package net.adoptopenjdk.api.v3

import net.adoptopenjdk.api.v3.models.ReleaseInfo
import org.eclipse.microprofile.openapi.annotations.Operation
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.Produces
import javax.ws.rs.core.MediaType


@Path("/v3/release_info/")
@Produces(MediaType.APPLICATION_JSON)
class ReleaseInfoResource {

    @GET
    @Operation(summary = "Returns information about available releases")
    fun get(): ReleaseInfo {
        return ReleaseInfo(listOf(), 11, 13)
    }


}