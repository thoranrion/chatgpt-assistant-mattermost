# Bot ChatGPT Assistant dla Mattermost

Bot komunikuje się z użytkownikami jak zwykły użytkownik Mattermost. To jakby mieć chat.openai.com wbudowany bezpośrednio w Mattermost!

## Funkcjonalności

Bot oferuje następujące możliwości:
- **Komunikacja w czasie rzeczywistym** - odpowiada na wiadomości w wątkach Mattermost
- **Kontekst konwersacji** - pamięta historię rozmowy w danym wątku
- **Asystent OpenAI** - używa predefiniowanego asystenta OpenAI do generowania odpowiedzi
- **Cachowanie** - asystent i wątki są cachowane dla lepszej wydajności
- **Obsługa błędów** - automatyczne zarządzanie błędami i ponowne próby

## Wymagania

Do uruchomienia bota potrzebujesz:
- [Token Mattermost](https://docs.mattermost.com/integrations/cloud-bot-accounts.html) dla użytkownika bota (`@chatgpt` domyślnie)
- [Klucz API OpenAI](https://platform.openai.com/account/api-keys)
- [Docker](https://www.docker.com/) do uruchomienia usługi, lub Node.js 20+ do testowania

## Opcje konfiguracji

Dostępne opcje można ustawić jako zmienne środowiskowe podczas uruchamiania [skryptu](./src/botservice.ts) lub konfigurowania pliku [docker-compose](#docker-compose).

| Nazwa                 | Wymagane | Przykładowa wartość          | Opis                                                                                                                                                                                                |
|----------------------|----------|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| MATTERMOST_URL       | tak      | `https://mattermost.server`  | URL serwera Mattermost. Używane do połączenia bota z API Mattermost                                                                                                                                |
| MATTERMOST_TOKEN     | tak      | `abababacdcdcd`              | Token uwierzytelniający zalogowanego bota Mattermost                                                                                                                                               |
| OPENAI_API_KEY       | tak      | `sk-234234234234234234`      | Klucz API OpenAI do uwierzytelnienia z OpenAI                                                                                                                                                      |
| OPENAI_API_BASE      | nie      | `http://example.com:8080/v1` | Adres kompatybilnego API OpenAI. Nadpisuje domyślną ścieżkę (`https://api.openai.com`)                                              |
| OPENAI_ASSISTANT_ID  | tak      | `asst_xxxxxxxxxxxxx`          | ID asystenta OpenAI do użycia. Musi być predefiniowanym ID asystenta.                                                                                                                              |
| NODE_EXTRA_CA_CERTS  | nie      | `/file/to/cert.crt`          | Ścieżka do pliku certyfikatu przekazywana do node.js dla uwierzytelniania certyfikatów z własnym podpisem                                                                                         |
| MATTERMOST_BOTNAME   | nie      | `"@chatgpt"`                 | Nazwa użytkownika bota w Mattermost, domyślnie '@chatgpt'                                                                                                                                          |
| DEBUG_LEVEL          | nie      | `TRACE`                      | Poziom debugowania używany do logowania aktywności, domyślnie `INFO`                                                                                                                               |
| BOT_CONTEXT_MSG      | nie      | `15`                         | Liczba poprzednich wiadomości dołączanych do konwersacji z ChatGPT, domyślnie 100                                                                                                                 |


## Budowanie obrazu Docker ręcznie

Pierwszym krokiem jest sklonowanie repozytorium.

```bash
git clone https://github.com/thoranrion/chatgpt-assistant-mattermost && cd chatgpt-assistant-mattermost
```

Do testowania możesz uruchomić `npm install` i `npm run start` bezpośrednio, ale pamiętaj o ustawieniu [zmiennych środowiskowych](#opcje-konfiguracji) lub przekazaniu ich do procesu node!

Do użytku produkcyjnego, aby utworzyć usługę w kontenerze Docker, która będzie zawsze dostępna bez konieczności uruchamiania na własnym komputerze, możesz wykonać następujące kroki:

Zbuduj obraz Docker z [Dockerfile](./Dockerfile):
```bash
docker build . -t chatgpt-assistant-mattermost:latest
```

Utwórz i uruchom kontener z obrazu
```bash
docker run -d --restart unless-stopped \
  -e MATTERMOST_URL=https://mattermost.server \
  -e MATTERMOST_TOKEN=abababacdcdcd \
  -e OPENAI_API_KEY=234234234234234234 \
  -e OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx \
  --name chatbot \
  chatgpt-assistant-mattermost:latest
```

### Prywatny certyfikat TLS
Jeśli Twoja instancja Mattermost używa certyfikatu TLS podpisanego przez prywatny CA, musisz
dostarczyć publiczny root CA do kontenera w celu walidacji.

Jeśli certyfikat root znajduje się w `/absolutepath/to/certfile.crt`, możesz
zamontować ten plik do kontenera w stałej pozycji i określić [zmienną środowiskową node](https://nodejs.org/api/cli.html#node_extra_ca_certsfile) odpowiednio:
```bash
docker run -d --restart unless-stopped \
  -v /absolutepath/to/certfile.crt:/certs/certfile.crt \
  -e NODE_EXTRA_CA_CERTS=/certs/certfile.crt \
  -e MATTERMOST_URL=https://mattermost.server \
  -e MATTERMOST_TOKEN=abababacdcdcd \
  -e OPENAI_API_KEY=234234234234234234 \
  --name chatbot \
  chatgpt-assistant-mattermost:latest
```

Sprawdź czy działa
```bash
docker ps
```

Później, aby zatrzymać usługę
```bash
docker stop chatbot
```

## Docker Compose
Jeśli chcesz uruchomić docker compose (może nawet połączyć z Twoim stosem docker mattermost), możesz użyć tego
jako punktu wyjścia: Najpierw dostosuj zmienne środowiskowe w `docker-compose.yml`.

### Wymagane zmienne środowiskowe
```yaml
MATTERMOST_URL: https://mattermost.server
MATTERMOST_TOKEN: abababacdcdcd
OPENAI_API_KEY: sk-234234234234234234
OPENAI_ASSISTANT_ID: asst_xxxxxxxxxxxxx
```

### Opcjonalne zmienne środowiskowe
```yaml
# Ustaw to jeśli używasz niestandardowej nazwy użytkownika dla bota, domyślnie = @chatgpt
MATTERMOST_BOTNAME: "@chatgpt"

# Poziom logowania konsoli, domyślnie = INFO
DEBUG_LEVEL: TRACE

# Środowisko Node, domyślnie = production
NODE_ENV: production
```

### Prywatny certyfikat TLS
Jeśli Twoja instancja Mattermost używa certyfikatu TLS podpisanego przez prywatny CA, musisz
dostarczyć publiczny root CA do kontenera w celu walidacji.

Jeśli certyfikat root znajduje się w `/absolutepath/to/certfile.crt`, możesz
połączyć poniższą zawartość z plikiem `docker-compose.yml`:
```yaml
services:
  chatbot:
    volumes:
      - /absolutepath/to/certfile.crt:/certs/certfile.crt:ro
    environment:
      NODE_EXTRA_CA_CERTS: /certs/certfile.crt
```

### Uruchom kontener jako usługę
Gdy konfiguracja jest kompletna, uruchom usługę kontenera.
```bash
docker compose up -d
```

Sprawdź czy działa:
```bash
docker compose ps
```

Aby zatrzymać kontener:
```bash
docker compose down
```