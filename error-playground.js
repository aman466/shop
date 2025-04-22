const sum = (a, b) => {
    if(a && b) {
        return a + b;
    }
    throw new Error("Both arguments are required");
};

// console.log(sum(1, 2)); // 3
// console.log(sum(1)); // NaN

try {
    console.log(sum(1)); // NaN
} catch (error) {
    console.error('Error occured');
    console.error(error);
    
}

console.log('End of program');