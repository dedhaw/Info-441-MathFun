import models from './models.js';

async function checkProblems() {
    try {
        const count = await models.MathProblem.countDocuments();
        console.log(`\n✅ Total math problems in database: ${count}\n`);

        const samples = await models.MathProblem.find().limit(10);

        if (samples.length > 0) {
            console.log('Sample problems:');
            console.log('─'.repeat(40));
            samples.forEach((p, i) => {
                console.log(`${i + 1}. ${p.problem} = ${p.answer}`);
            });
            console.log('─'.repeat(40));
        } else {
            console.log('No problems found in database yet.');
        }

        const addition = await models.MathProblem.countDocuments({ problem: { $regex: /\+/ } });
        const subtraction = await models.MathProblem.countDocuments({ problem: { $regex: /-/ } });
        const multiplication = await models.MathProblem.countDocuments({ problem: { $regex: /×/ } });
        const division = await models.MathProblem.countDocuments({ problem: { $regex: /÷/ } });

        console.log('\nBreakdown:');
        console.log(`  Addition (+): ${addition}`);
        console.log(`  Subtraction (-): ${subtraction}`);
        console.log(`  Multiplication (×): ${multiplication}`);
        console.log(`  Division (÷): ${division}\n`);

        process.exit(0);
    } catch (error) {
        console.error('Error checking problems:', error);
        process.exit(1);
    }
}

checkProblems();