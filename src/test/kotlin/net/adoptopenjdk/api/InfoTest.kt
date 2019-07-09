package net.adoptopenjdk.api


import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import net.adoptopenjdk.api.APITestUtils.Companion.releaseVersionPermutations
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import java.util.stream.Stream


@QuarkusTest
open class InfoTest {
    @TestFactory
    fun testDynamicTestStream(): Stream<DynamicTest> {
        return releaseVersionPermutations({ releaseType, releaseVersion ->
            given()
                    .`when`()
                    .get("/v3/info/${releaseType}/${releaseVersion}")
                    .then()
                    .statusCode(200)
        })
    }

    @Test
    fun badVersion() {
        given()
                .`when`()
                .get("/v3/info/releases/openjdk3")
                .then()
                .statusCode(404)
    }

    @Test
    fun goodVersion() {
        given()
                .`when`()
                .get("/v3/info/releases/openjdk13")
                .then()
                .statusCode(200)
    }

}

