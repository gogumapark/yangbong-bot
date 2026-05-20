const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes,
    EmbedBuilder
} = require('discord.js');

const token = process.env.TOKEN;
const clientId = '1506507365560877156';
const guildId = '1172129810861015131';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const userFortunes = {};

const commands = [
    new SlashCommandBuilder()
        .setName('소개')
        .setDescription('안녕 날 소개하지'),

    new SlashCommandBuilder()
        .setName('안녕')
        .setDescription('양봉이에게 인사해보세요.'),

    new SlashCommandBuilder()
        .setName('주사위')
        .setDescription('주사위를 굴립니다'),

    new SlashCommandBuilder()
        .setName('운세')
        .setDescription('오늘의 운세를 알려줍니다')
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('슬래시 명령어 등록중...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('슬래시 명령어 등록 완료!');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`${client.user.tag} 로그인 완료!`);
});

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // /핑
    if (interaction.commandName === '안녕') {
        await interaction.reply('인사 똑바로해라.');
    }

    // /주사위
    if (interaction.commandName === '주사위') {

        const dice = Math.floor(Math.random() * 6) + 1;

        await interaction.reply(`🎲 금나와라 뚝딱!! : ${dice}`);
    }

    if (interaction.commandName === '운세') {

       const userId = interaction.user.id;

        const today =
            new Date().toLocaleDateString();

        // 하루 1번 제한
        if (userFortunes[userId] === today) {

            return interaction.reply({
                content: '❌ 하루에 한번만~',
                ephemeral: true
            });
        }

    // 오늘 날짜 저장
    userFortunes[userId] = today;


    const fortunes = [
        '🍀 오늘의 당신은 럭키가이!!',
        '🔥 타올라라 열정이여!! 오늘은 성공의 느낌',
        '💤 푹 쉬어라...',
        '💰 왜인지 뜻밖의 행운이?!',
        '💻 게임하자 오늘은 그래도 돼.',
        '📙 공부나 해라....',
        '⚡ 안좋은일이 있을수도..',
        '💚 연애운 급 상승~!'
    ];


        const random =
            fortunes[Math.floor(Math.random() * fortunes.length)];

        await interaction.reply(
            `🔮 오늘의 운세\n\n${random}`
        );

    }

    if (interaction.commandName === '소개') {

        const embed = new EmbedBuilder()
            .setTitle('🐝 양봉이 봇')
            .setDescription(
                '안녕 날 소개하지 난 양봉장의 전용 봇 양봉이라고 하오'
            )
            .setColor('Green')
            .setThumbnail(
                'https://cdn.discordapp.com/attachments/1110460136373366845/1506536312423841873/image.png?ex=6a0e9ec6&is=6a0d4d46&hm=df046c8c3c4fd195fbe36ebaa666f13d010f5be1b03090e878b5b53b8276c237&'
            )
            .setFooter({
                text: '양봉장 봇 시스템'
            });

        await interaction.reply({
            embeds: [embed]
        });

    }



});

client.login(token);