import models from './models.js';

function generateMathProblems() {
    const problems = [];

    // Addition problems
    for (let i = 0; i < 13; i++) {
        const a = Math.floor(Math.random() * 100) + 1;
        const b = Math.floor(Math.random() * 100) + 1;
        problems.push({
            problem: `${a} + ${b}`,
            answer: a + b
        });
    }

    // Subtraction problems
    for (let i = 0; i < 12; i++) {
        const a = Math.floor(Math.random() * 100) + 1;
        const b = Math.floor(Math.random() * a) + 1;
        problems.push({
            problem: `${a} - ${b}`,
            answer: a - b
        });
    }

    // Multiplication problems
    for (let i = 0; i < 12; i++) {
        const a = Math.floor(Math.random() * 12) + 1;
        const b = Math.floor(Math.random() * 12) + 1;
        problems.push({
            problem: `${a} × ${b}`,
            answer: a * b
        });
    }

    // Division problems
    for (let i = 0; i < 13; i++) {
        const b = Math.floor(Math.random() * 12) + 1;
        const quotient = Math.floor(Math.random() * 12) + 1;
        const a = b * quotient;
        problems.push({
            problem: `${a} ÷ ${b}`,
            answer: quotient
        });
    }

    return problems;
}

async function seedDatabase() {
    try {
        console.log('Generating math problems...');
        const problems = generateMathProblems();

        console.log(`Inserting ${problems.length} math problems into database...`);
        await models.MathProblem.insertMany(problems);

        console.log('Successfully seeded database with math problems!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();