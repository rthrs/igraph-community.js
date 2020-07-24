function printAlgorithmName(name) {
    console.log();
    console.log(name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase());
}

module.exports = {
    printAlgorithmName
};
