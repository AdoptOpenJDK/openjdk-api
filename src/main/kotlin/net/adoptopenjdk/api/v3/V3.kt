package net.adoptopenjdk.api.v3

import net.adoptopenjdk.api.v3.models.ApiEnums
import org.eclipse.microprofile.openapi.annotations.Components
import org.eclipse.microprofile.openapi.annotations.OpenAPIDefinition
import org.eclipse.microprofile.openapi.annotations.info.Info
import org.eclipse.microprofile.openapi.annotations.media.Schema
import org.eclipse.microprofile.openapi.annotations.servers.Server
import javax.ws.rs.core.Application

@OpenAPIDefinition(
        servers = [Server(url = "https://api.adoptopenjdk.com/v3/")],
        components = Components(schemas = [

            //Force enums to be included in schema so that we can refer to them via $ref
            Schema(name = "ApiEnums", implementation = ApiEnums::class)
        ]), info = Info(title = "v3", version = "3.0.0"))
class V3 : Application() {

}