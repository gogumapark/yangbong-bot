const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is alive');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const token = process.env.TOKEN;
const clientId = '1506507365560877156';
const guildId = '1172129810861015131';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const tttGames = new Map();
const letters = new Map();

const deletedMessages = new Map();

client.on('messageDelete', message => {

    // 봇 메시지 무시
    if (message.author?.bot) return;

    deletedMessages.set(message.channel.id, {

        author: message.author.tag,
        content: message.content || '(내용 없음)',
        createdAt: new Date()

    });

});

const userFortunes = {};

const commands = [
    new SlashCommandBuilder()
        .setName('도움말')
        .setDescription('양봉이의 도움말을 확인합니다.'),

    new SlashCommandBuilder()
        .setName('안녕')
        .setDescription('양봉이에게 인사해보세요.'),

    new SlashCommandBuilder()
        .setName('주사위')
        .setDescription('주사위를 굴립니다'),

    new SlashCommandBuilder()
        .setName('운세')
        .setDescription('오늘의 운세를 알려줍니다'),

    new SlashCommandBuilder()
    .setName('청소')
    .setDescription('메시지를 삭제합니다')
    .addIntegerOption(option =>
        option
            .setName('개수')
            .setDescription('삭제할 메시지 개수')
            .setRequired(true)
    ),

    new SlashCommandBuilder()
    .setName('삭제로그')
    .setDescription('최근 삭제된 메시지를 확인합니다'),

    new SlashCommandBuilder()
    .setName('유저정보')
    .setDescription('유저정보를 확인합니다')
    .addUserOption(option =>
        option
            .setName('유저')
            .setDescription('정보를 볼 유저')
            .setRequired(false)
    ),

    new SlashCommandBuilder()
    .setName('틱택토')
    .setDescription('틱택토 게임을 시작합니다'),

    new SlashCommandBuilder()
    .setName('편지')
    .setDescription('유저에게 편지를 보냅니다')
    .addUserOption(option =>
        option.setName('유저')
            .setDescription('받는 사람')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('종류')
            .setDescription('편지 종류')
            .setRequired(true)
            .addChoices(
                { name: '우정의 편지', value: 'friend' },
                { name: '러브레터', value: 'love' },
                { name: '결투신청서', value: 'duel' }
            )
    )
    .addStringOption(option =>
        option.setName('내용')
            .setDescription('편지 내용')
            .setRequired(true)
    ),

    new SlashCommandBuilder()
    .setName('편지함')
    .setDescription('받은 편지를 확인합니다')
    
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

function createBoard(gameId) {
    const game = tttGames.get(gameId);

    const rows = [];

    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();

        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${gameId}_${index}`)
                    .setLabel(game.board[index] || '⬜')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!!game.board[index])
            );
        }

        rows.push(row);
    }

    return rows;
}


client.on('interactionCreate', async interaction => {

    // 1. 버튼 먼저 처리
    if (interaction.isButton()) {
        // 편지 버튼
        if (interaction.customId.startsWith('letter_')) {
            const id = interaction.customId.split('_')[1];
            const letter = letters.get(id);

            if (!letter) return interaction.reply({ content: '편지 없음', ephemeral: true });

            return interaction.reply({
                content: `📬 내용: ${letter.content}`,
                ephemeral: true
            });
        }

        return;
    }

    // 2. 슬래시 커맨드 처리
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === '안녕') {
        return interaction.reply('인사 똑바로해라.');
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

    if (interaction.commandName === '도움말') {

    const embed = new EmbedBuilder()
        .setTitle('🐝 양봉이')
        .setDescription('**안녕!!** 난 양봉장의 전용 봇 양봉이라 하오!!')
        .setColor('Green')
        .setThumbnail(
            'https://cdn.discordapp.com/attachments/1110460136373366845/1506536312423841873/image.png'
        )
        .setFooter({
            text: '양봉장의 전용 봇, 아이스크림을 굉장히 좋아한다.\n\n' +
            '도움말'
        });

    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

    const menu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 카테고리를 선택하세요')
        .addOptions(
            {
                label: '기본',
                description: ' 안녕 / 도움말',
                value: 'basic'
            },
            {
                label: '게임',
                description: '틱택토 / 주사위',
                value: 'game'
            },
            {
                label: '관리',
                description: '청소 / 삭제로그',
                value: 'admin'
            },
            {
                label: '소셜',
                description: '편지 / 편지함',
                value: 'social'
            }
        );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

if (interaction.commandName === '청소') {

    // 관리자 권한 체크
    if (!interaction.member.permissions.has('ManageMessages')) {

        return interaction.reply({
            content: '❌ 메시지 관리 권한 없잖아!',
            ephemeral: true
        });

    }

    const amount =
        interaction.options.getInteger('개수');

    // 1~100 제한
    if (amount < 1 || amount > 100) {

        return interaction.reply({
            content: '❌ 1~100개만 삭제 가능함 ㅇㅇ.;;;',
            ephemeral: true
        });

    }

    await interaction.channel.bulkDelete(amount, true);

    await interaction.reply({
        content: `🧹 메시지 ${amount}개 삭제 완료!`,
        ephemeral: true
    });

}

if (interaction.commandName === '삭제로그') {

    const data =
        deletedMessages.get(interaction.channel.id);

    if (!data) {

        return interaction.reply({
            content: '❌ 최근 삭제된 메시지가 없다!',
            ephemeral: true
        });

    }

    const embed = new EmbedBuilder()
        .setTitle('🗑 최근 삭제된 메시지')
        .addFields(
            {
                name: '작성자',
                value: data.author
            },
            {
                name: '내용',
                value: data.content
            }
        )
        .setColor('Red');

    await interaction.reply({
        embeds: [embed]
    });

}

if (interaction.commandName === '유저정보') {

    await interaction.deferReply();

    const targetUser =
        interaction.options.getUser('유저') || interaction.user;

    // 기본 유저 정보
    const user = await client.users.fetch(targetUser.id);

    // 서버 멤버 정보 (없을 수도 있음 → 안전 처리)
    let member = null;
    try {
        member = await interaction.guild.members.fetch(targetUser.id);
    } catch {
        member = null;
    }

    // 추가 정보
    const fullUser = await user.fetch();

    const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .map(r => `<@&${r.id}>`)
        .join(' ') || '없음';

    const embed = new EmbedBuilder()
        .setTitle('👤 유저 정보')
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setImage(fullUser.bannerURL({ size: 1024 }) || null)
        .setColor('Blue')
        .addFields(
            {
                name: '유저 닉네임',
                value: member?.nickname || user.username,
                inline: true
            },
            {
                name: '유저 ID',
                value: user.id,
                inline: true
            },
            {
                name: '디스코드 가입일',
                value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                inline: true
            },
            {
                name: '서버 가입일',
                value: member
                    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                    : '서버 없음',
                inline: true
            },
            {
                name: '서버 역할',
                value: roles
            }
        );

    return interaction.editReply({ embeds: [embed] });
}

if (interaction.commandName === '틱택토') {

    const gameId = interaction.id;

    tttGames.set(gameId, {
        board: Array(9).fill(null),
        turn: '❌'
    });

    await interaction.reply({
        content: '🎮 틱택토 시작! ❌ 먼저',
        components: createBoard(gameId)
    });
}


if (interaction.commandName === '편지') {

    const to = interaction.options.getUser('유저');
    const type = interaction.options.getString('종류');
    const content = interaction.options.getString('내용');

    const letter = {
        from: interaction.user.id,
        to: to.id,
        type,
        content,
        createdAt: new Date()
    };

    const id = Date.now().toString();

    letters.set(id, letter);

    await interaction.reply({
        content: `📨 편지를 보냈다! (${to.username})`,
        ephemeral: true
    });

    // 받은 사람 DM
    try {
        await to.send(`📬 새로운 편지가 도착했습니다! 양봉장에서 **/편지함** 으로 확인하세요.`);
    } catch {}
}


    if (interaction.commandName === '편지함') {

    const userLetters = [...letters.entries()]
        .filter(([id, l]) => l.to === interaction.user.id);

    if (userLetters.length === 0) {
        return interaction.reply({
            content: '📭 받은 편지가 없습니다.',
            ephemeral: true
        });
    }

    const buttons = userLetters.map(([id, l], index) =>
        new ButtonBuilder()
            .setCustomId(`letter_${id}`)
            .setLabel(`${l.type === 'love' ? '💌 러브' : l.type === 'duel' ? '⚔ 결투' : '🤝 우정'} #${index + 1}`)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons.slice(0, 5));

    await interaction.reply({
        content: '📬 편지를 선택하세요',
        components: [row],
        ephemeral: true
    });
}

    if (interaction.isButton() && interaction.customId.startsWith('letter_')) {

    const id = interaction.customId.split('_')[1];
    const letter = letters.get(id);

    if (!letter) return;

    const fromUser = await client.users.fetch(letter.from);

    const typeEmoji = {
        friend: '🤝 우정의 편지',
        love: '💌 러브레터',
        duel: '⚔ 결투신청서'
    };

    const embed = new EmbedBuilder()
        .setTitle(typeEmoji[letter.type])
        .setDescription(letter.content)
        .addFields(
            { name: '보낸 사람', value: fromUser.username },
            { name: '날짜', value: `<t:${Math.floor(letter.createdAt / 1000)}:R>` }
        )
        .setColor(
            letter.type === 'love' ? 'Red' :
            letter.type === 'duel' ? 'DarkRed' : 'Green'
        );

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

})

client.on('interactionCreate', async interaction => {

    // ======================
    // 1. 버튼 처리
    // ======================
    if (interaction.isButton()) {
        // 기존 버튼 코드 그대로
    }

    // ======================
    // 2. select menu 처리 (이거 꼭!)
    // ======================
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_menu') {

        const value = interaction.values[0];

        let embed = new EmbedBuilder()
            .setColor('Green');

        if (value === 'basic') {
            embed.setTitle('📌 기본 명령어')
                .setDescription('/소개\n/안녕\n/도움말');
        }

        if (value === 'game') {
            embed.setTitle('🎮 게임')
                .setDescription('/주사위\n/틱택토');
        }

        if (value === 'admin') {
            embed.setTitle('🧹 관리')
                .setDescription('/청소\n/삭제로그');
        }

        if (value === 'social') {
            embed.setTitle('💌 소셜')
                .setDescription('/편지\n/편지함');
        }

        return interaction.update({ embeds: [embed] });
    }

    // ======================
    // 3. 슬래시 커맨드 처리
    // ======================
    if (!interaction.isChatInputCommand()) return;

    // /도움말
    if (interaction.commandName === '도움말') {
        // 너 embed + menu 코드
    }

});

client.login(token);
