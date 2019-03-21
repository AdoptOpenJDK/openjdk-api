namespace v3 {
  function performGetRequest(req, res) {
    res.status(404);
    res.send('Not found');
  }

  export class V3 {
    cache: any;// eslint-disable-line no-unused-vars

    constructor(cache) {
      this.cache = cache
    }

    get(req, res) {
      return performGetRequest(req, res);
    }
  }
}
console.log("LOADING ROUTE v3")
export default v3.V3

