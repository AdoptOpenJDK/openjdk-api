package net.adoptopenjdk.api.v3

import net.adoptopenjdk.api.v3.models.ApiProperties
import org.eclipse.microprofile.openapi.annotations.Components
import org.eclipse.microprofile.openapi.annotations.OpenAPIDefinition
import org.eclipse.microprofile.openapi.annotations.enums.ParameterIn
import org.eclipse.microprofile.openapi.annotations.info.Info
import org.eclipse.microprofile.openapi.annotations.media.Schema
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.servers.Server
import javax.ws.rs.core.Application

@OpenAPIDefinition(
        servers = [
            Server(url = "http://api.adoptopenjdk.com/v3/")
        ],
        components = Components(
                parameters = [
                    //Force enums to be included in schema so that we can refer to them via $ref
                    Parameter(name = "ApiProperties", schema = Schema(name = "ApiProperties", implementation = ApiProperties::class), required = true, `in` = ParameterIn.PATH)
                ]), info = Info(title = "v3", version = "3.0.0"))
class V3 : Application() {

}