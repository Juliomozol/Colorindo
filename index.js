import { Client, GatewayIntentBits, EmbedBuilder, Partials } from "discord.js";
import dotenv from "dotenv";
import express from "express";
dotenv.config();

const app = express();
app.get("/", (req, res) => res.send("🤖 Bot do Discord está online!"));
app.listen(process.env.PORT || 3000, () =>
  console.log("🌐 Servidor keep-alive rodando!")
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

function isValidHexColor(color) {
  return /^#([0-9A-F]{6}|[0-9A-F]{3})$/i.test(color);
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "!msg") {
    const filter = (m) => m.author.id === message.author.id;
    const channel = message.channel;

    try {
      // Perguntar se será mensagem normal ou embed
      await channel.send(
        "❓ Você quer enviar uma **mensagem normal** ou uma **embed**? Responda `normal` ou `embed`."
      );
      const tipoMsgMsg = await channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
      });
      const tipoMsg = tipoMsgMsg.first().content.toLowerCase();

      if (tipoMsg === "normal") {
        // Mensagem normal: só pergunta o conteúdo e envia direto
        await channel.send("💬 Qual é o conteúdo da mensagem?");
        const conteudoMsg = await channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });
        const conteudo = conteudoMsg.first().content;

        await channel.send(
          "📢 Em qual canal você quer enviar a mensagem? (mencione com #)"
        );
        const canalMsg = await channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });
        const canal = canalMsg.first().mentions.channels.first();
        if (!canal)
          return channel.send(
            "❌ Canal inválido. Tente novamente com `#nomedocanal`."
          );

        await canal.send(conteudo);
        await channel.send("✅ Mensagem enviada com sucesso!");
        return;
      }

      if (tipoMsg === "embed") {
        // Pergunta o canal primeiro
        await channel.send(
          "📢 Em qual canal você quer enviar a mensagem? (mencione com #)"
        );
        const canalMsg = await channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });
        const canal = canalMsg.first().mentions.channels.first();
        if (!canal)
          return channel.send(
            "❌ Canal inválido. Tente novamente com `#nomedocanal`."
          );

        // Pergunta se terá título
        await channel.send(
          "📝 Deseja adicionar um **título**? Se não quiser, digite `não`."
        );
        const tituloMsg = await channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });
        const titulo =
          tituloMsg.first().content.toLowerCase() === "não"
            ? null
            : tituloMsg.first().content;

        // Pergunta o conteúdo (obrigatório)
        await channel.send("💬 Qual será o **conteúdo** da mensagem?");
        const conteudoMsg = await channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });
        const conteudo = conteudoMsg.first().content;

        // Pergunta a imagem (com validação e possibilidade de repetir)
        let imagem = null;
        while (true) {
          await channel.send(
            "🖼️ Deseja adicionar uma **imagem principal**? Envie a URL ou digite `não`."
          );
          const imagemMsg = await channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
          });
          const resposta = imagemMsg.first().content.toLowerCase();
          if (resposta === "não") {
            imagem = null;
            break;
          }
          if (isValidUrl(resposta)) {
            imagem = resposta;
            break;
          } else {
            await channel.send(
              "❌ URL inválida. Por favor, envie uma URL válida ou digite `não`."
            );
          }
        }

        // Pergunta a cor da embed (com validação e repetir até válido)
        let cor = null;
        while (true) {
          await channel.send(
            "🎨 Qual será a **cor** da embed? (Exemplo: `#ff0000`)"
          );
          const corMsg = await channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
          });
          const respostaCor = corMsg.first().content;
          if (isValidHexColor(respostaCor)) {
            cor = respostaCor;
            break;
          } else {
            await channel.send(
              "❌ Cor inválida! Use um código hexadecimal, ex: `#ff0000`. Tente novamente."
            );
          }
        }

        // Montar embed
        const embed = new EmbedBuilder()
          .setDescription(conteudo)
          .setColor(cor)
          .setTimestamp();
        if (titulo) embed.setTitle(titulo);
        if (imagem) embed.setImage(imagem);

        // Envia prévia no próprio canal para o usuário, depois confirma envio
        const previewMsg = await channel.send({
          content: `${message.author}, aqui está a prévia da sua mensagem embed (somente você veja! 🕵️‍♂️)`,
          embeds: [embed],
        });

        await channel.send(
          `${message.author}, deseja enviar essa mensagem? Responda \`sim\` para enviar ou \`não\` para cancelar.`
        );

        const respostaFinal = await channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });

        if (respostaFinal.first().content.toLowerCase() === "sim") {
          await canal.send({ embeds: [embed] });
          await channel.send("✅ Mensagem enviada com sucesso!");
          // Apaga a prévia para não ficar no chat
          await previewMsg.delete().catch(() => {});
        } else {
          await channel.send("❌ Envio cancelado.");
          await previewMsg.delete().catch(() => {});
        }
        return;
      }

      // Resposta inválida para tipo mensagem
      await channel.send(
        "❌ Resposta inválida. Por favor, digite `normal` ou `embed`."
      );
    } catch (err) {
      console.error(err);
      channel.send("⏰ Tempo esgotado ou ocorreu um erro. Tente novamente.");
    }
  }
});

client.login(process.env.TOKEN);
