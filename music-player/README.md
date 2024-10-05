Documentação da API de Playlist
Visão Geral
Esta API permite gerenciar uma playlist de vídeos do YouTube, incluindo adicionar, remover e listar vídeos. A API está construída sobre o Express.js e fornece uma interface RESTful para interagir com a lista de reprodução.

Base URL
bash
Copiar código
http://localhost:3000/api
Endpoints
1. Obter Playlist
Método: GET

Endpoint: /playlist

Descrição: Retorna a lista atual de vídeos na playlist.

Resposta de Sucesso:

json
Copiar código
[
  {
    "id": "video_id_1",
    "title": "Video Title 1"
  },
  {
    "id": "video_id_2",
    "title": "Video Title 2"
  }
]
Código de Resposta HTTP:

200 OK - A lista de vídeos foi retornada com sucesso.
500 Internal Server Error - Erro ao recuperar a playlist.
2. Adicionar Vídeo à Playlist
Método: POST

Endpoint: /playlist

Descrição: Adiciona um novo vídeo à playlist.

Corpo da Requisição:

json
Copiar código
{
  "videoId": "video_id",
  "videoTitle": "Video Title"
}
Resposta de Sucesso:

json
Copiar código
{
  "message": "Video added successfully."
}
Código de Resposta HTTP:

201 Created - O vídeo foi adicionado à playlist com sucesso.
400 Bad Request - Dados da requisição inválidos.
500 Internal Server Error - Erro ao adicionar o vídeo.
3. Avançar para o Próximo Vídeo
Método: POST

Endpoint: /playlist/next

Descrição: Remove o vídeo atual da playlist e avança para o próximo vídeo.

Resposta de Sucesso:

json
Copiar código
{
  "message": "Moved to the next video."
}
Código de Resposta HTTP:

200 OK - O próximo vídeo foi carregado com sucesso.
500 Internal Server Error - Erro ao avançar para o próximo vídeo.
4. Remover Vídeo da Playlist
Método: DELETE

Endpoint: /playlist/:id

Descrição: Remove um vídeo específico da playlist pelo ID do vídeo.

Parâmetros de URL:

id - O ID do vídeo a ser removido.
Resposta de Sucesso:

json
Copiar código
{
  "message": "Video removed successfully."
}
Código de Resposta HTTP:

200 OK - O vídeo foi removido da playlist com sucesso.
404 Not Found - Vídeo não encontrado.
500 Internal Server Error - Erro ao remover o vídeo.
Exemplos de Requisição e Resposta
Obter Playlist
Requisição:

http
Copiar código
GET /api/playlist
Resposta:

json
Copiar código
[
  {
    "id": "video_id_1",
    "title": "Video Title 1"
  }
]
Adicionar Vídeo à Playlist
Requisição:

http
Copiar código
POST /api/playlist
Content-Type: application/json

{
  "videoId": "new_video_id",
  "videoTitle": "New Video Title"
}
Resposta:

json
Copiar código
{
  "message": "Video added successfully."
}
Avançar para o Próximo Vídeo
Requisição:

http
Copiar código
POST /api/playlist/next
Resposta:

json
Copiar código
{
  "message": "Moved to the next video."
}
Remover Vídeo da Playlist
Requisição:

http
Copiar código
DELETE /api/playlist/video_id_1
Resposta:

json
Copiar código
{
  "message": "Video removed successfully."
}
Observações
Certifique-se de que o backend esteja em execução e que o servidor esteja acessível através da base URL especificada.
As respostas de erro devem fornecer informações suficientes para depuração.
Para segurança e boas práticas, considere adicionar autenticação e autorização conforme necessário.
