class Error404 extends Error {
  constructor(message) {
    super(message);
    this.name = 'Error404';
  }
}

module.exports = Error404;