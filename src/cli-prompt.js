const readline = require('readline');

async function promptUser(question, options, defaultOption = 1) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log(`\n${question}`);
        options.forEach(opt => console.log(opt));
        console.log('');

        rl.question('Выберите опцию (введите номер или Enter для по умолчанию): ', (answer) => {
            rl.close();
            const trimmed = answer.trim();

            if (trimmed === '') {
                resolve(defaultOption);
            } else {
                const choice = parseInt(trimmed);
                if (choice === 2 && choice <= options.length) {
                    resolve(2);
                } else {
                    resolve(defaultOption);
                }
            }
        });
    });
}

module.exports = {
    promptUser,
};

