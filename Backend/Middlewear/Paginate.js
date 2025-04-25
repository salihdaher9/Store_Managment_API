function paginatedResults(model) {
  return async (req,res,next)=>{
    const name = req.query.name || ""; // Default to an empty string if no query

    const page = parseInt(req.query.page) ; // Default to page 1
    const limit = parseInt(req.query.limit); 

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

 const totalCount = await model.countDocuments({
   // If name is provided, filter by name inside items, otherwise no filtering by name
   ...(name ? { "items.name": { $regex: name, $options: "i" } } : {}),
 });

    
    if (! (endIndex > totalCount)) {
      results.next = {
        page: page + 1,
        limit: limit,
      };
    }

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit,
      };
    }
results.results = await model
  .find({
    ...(name ? { 'items.name': { $regex: name, $options: 'i' } } : {}) // If `name` is provided, filter by `items.name`
  })
  .limit(limit)
  .skip(startIndex)
  .exec();
    
    res.paginatedResults=results;
    next();
  }
}

module.exports = paginatedResults;