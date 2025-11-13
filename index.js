// 📦 Importações e configuração
import { Client, GatewayIntentBits, EmbedBuilder, Partials } from "discord.js";
import dotenv from "dotenv";
import express from "express";
dotenv.config();

// 🌐 Servidor para manter o bot online
const app = express();
app.get("/", (req, res) => res.send("🤖 Bot do Discord está online!"));
app.listen(process.env.PORT || 3000, () =>
  console.log("🌐 Servidor keep-alive rodando!")
);

// 🤖 Inicialização do cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel] // Necessário para receber mensagens por DM
});

client.once("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "!msg") {
    const filter = (m) => m.author.id === message.author.id;
    const channel = message.channel;

    try {
      // Pergunta o canal
      await channel.send("📢 Em qual canal você quer enviar a mensagem? (mencione com #)");
      const canalMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const canal = canalMsg.first().mentions.channels.first();
      if (!canal) return channel.send("❌ Canal inválido. Tente novamente com `#nomedocanal`.");

      // Pergunta o título
      await channel.send("📝 Qual será o **título** da mensagem?");
      const tituloMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const titulo = tituloMsg.first().content;

      // Pergunta o conteúdo
      await channel.send("💬 Qual será o **conteúdo** da mensagem?");
      const conteudoMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const conteudo = conteudoMsg.first().content;

      // Pergunta se terá imagem principal
      await channel.send("🖼️ Deseja adicionar uma **imagem principal**? (envie a URL ou digite `não`)");
      const imagemMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const imagem = imagemMsg.first().content.toLowerCase() === "não" ? null : imagemMsg.first().content;

      // Pergunta se terá thumbnail
      await channel.send("🧩 Deseja adicionar uma **thumbnail (miniatura)**? (envie a URL ou digite `não`)");
      const thumbMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const thumbnail = thumbMsg.first().content.toLowerCase() === "não" ? null : thumbMsg.first().content;

      // Pergunta a cor da embed
      await channel.send("🎨 Qual será a **cor** da embed? (Exemplo: `#ff0000`)");
      const corMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const cor = corMsg.first().content;

      // Cria o embed
      const embed = new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(conteudo)
        .setColor(cor)
        .setTimestamp();

      if (imagem) embed.setImage(imagem);
      if (thumbnail) embed.setThumbnail(thumbnail);

      // Envia no canal escolhido
      await canal.send({ embeds: [embed] });
      await channel.send("✅ Mensagem enviada com sucesso!");

    } catch (err) {
      console.error(err);
      channel.send("⏰ Tempo esgotado ou ocorreu um erro. Tente novamente.");
    }
  }
});

client.login(process.env.TOKEN);
