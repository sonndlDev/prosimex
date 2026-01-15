const http = require("http");

const server = http.createServer((req, res) => {
  res.end("Backend OK");
});

server.listen(3000, () => {
  console.log("Backend running on port 3000");
});
