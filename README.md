# Bot ChatGPT Assistant dla Mattermost

Bot komunikuje się z użytkownikami jak zwykły użytkownik Mattermost. To jakby mieć chat.openai.com wbudowany bezpośrednio w Mattermost!
Aplikacja zbudowana na bazie [chatgpt-mattermost-bot](https://github.com/yGuy/chatgpt-mattermost-bot) 

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

Andrew Zigler z Mattermost stworzył [film na YouTube](https://www.youtube.com/watch?v=Hx4Ex7YZZiA), który szybko przeprowadzi Cię przez konfigurację.


## Opcje konfiguracji

Dostępne opcje można ustawić jako zmienne środowiskowe podczas uruchamiania [skryptu](./src/botservice.ts),
[obrazu Docker](#using-the-ready-made-docker-image) lub konfigurowania pliku [docker-compose](#docker-compose).

| Nazwa                 | Wymagane | Przykładowa wartość          | Opis                                                                                                                                                                                                |
|----------------------|----------|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| MATTERMOST_URL       | tak      | `https://mattermost.server`  | URL serwera Mattermost. Używane do połączenia bota z API Mattermost                                                                                                                                |
| MATTERMOST_TOKEN     | tak      | `abababacdcdcd`              | Token uwierzytelniający zalogowanego bota Mattermost                                                                                                                                               |
| OPENAI_API_KEY       | tak      | `sk-234234234234234234`      | Klucz API OpenAI do uwierzytelnienia z OpenAI                                                                                                                                                      |
| OPENAI_API_BASE      | nie      | `http://example.com:8080/v1` | Adres kompatybilnego API OpenAI. Nadpisuje domyślną ścieżkę (`https://api.openai.com`)                                              |
| OPENAI_MODEL_NAME    | nie      | `gpt-3.5-turbo`              | Model językowy OpenAI do użycia, domyślnie `gpt-3.5-turbo`                                                                                                                                        |
| OPENAI_MAX_TOKENS    | nie      | `2000`                       | Maksymalna liczba tokenów przekazywana do API OpenAI, domyślnie 2000                                                                                                                               |
| OPENAI_TEMPERATURE   | nie      | `0.2`                        | Temperatura próbkowania, między 0 a 2, domyślnie 1. Wyższe wartości jak 0.8 sprawią, że wynik będzie bardziej losowy, niższe jak 0.2 bardziej skupiony i deterministyczny. |
| OPENAI_ASSISTANT_ID  | tak      | `asst_xxxxxxxxxxxxx`          | ID asystenta OpenAI do użycia. Musi być predefiniowanym ID asystenta.                                                                                                                              |
| NODE_EXTRA_CA_CERTS  | nie      | `/file/to/cert.crt`          | Ścieżka do pliku certyfikatu przekazywana do node.js dla uwierzytelniania certyfikatów z własnym podpisem                                                                                         |
| MATTERMOST_BOTNAME   | nie      | `"@chatgpt"`                 | Nazwa użytkownika bota w Mattermost, domyślnie '@chatgpt'                                                                                                                                          |
| DEBUG_LEVEL          | nie      | `TRACE`                      | Poziom debugowania używany do logowania aktywności, domyślnie `INFO`                                                                                                                               |
| BOT_CONTEXT_MSG      | nie      | `15`                         | Liczba poprzednich wiadomości dołączanych do konwersacji z ChatGPT, domyślnie 100                                                                                                                 |
| BOT_INSTRUCTION      | nie      | `Act like Elon Musk`         | Dodatkowe instrukcje dla asystenta. Jak powinien się zachowywać?                                                                                                                                   |

## Używanie gotowego obrazu Docker

Użyj predefiniowanego obrazu z [`ghcr.io/yguy/chatgpt-mattermost-bot`](https://ghcr.io/yguy/chatgpt-mattermost-bot)

```bash
docker run -d --restart unless-stopped \
  -e MATTERMOST_URL=https://mattermost.server \
  -e MATTERMOST_TOKEN=abababacdcdcd \
  -e OPENAI_API_KEY=234234234234234234 \
  -e OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx \
  --name chatbot \
  ghcr.io/yguy/chatgpt-mattermost-bot:latest
```

## Budowanie obrazu Docker ręcznie

Pierwszym krokiem jest sklonowanie repozytorium.

```bash
git clone https://github.com/yGuy/chatgpt-mattermost-bot.git && cd chatgpt-mattermost-bot
```

Do testowania możesz uruchomić `npm install` i `npm run start` bezpośrednio, ale pamiętaj o ustawieniu [zmiennych środowiskowych](#opcje-konfiguracji) lub przekazaniu ich do procesu node!

Do użytku produkcyjnego, aby utworzyć usługę w kontenerze Docker, która będzie zawsze dostępna bez konieczności uruchamiania na własnym komputerze, możesz wykonać następujące kroki:

Zbuduj obraz Docker z [Dockerfile](./Dockerfile):
```bash
docker build . -t yguy/chatgpt-mattermost-bot
```

Utwórz i uruchom kontener z obrazu
```bash
docker run -d --restart unless-stopped \
  -e MATTERMOST_URL=https://mattermost.server \
  -e MATTERMOST_TOKEN=abababacdcdcd \
  -e OPENAI_API_KEY=234234234234234234 \
  -e OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx \
  --name chatbot \
  yguy/chatgpt-mattermost-bot
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
  yguy/chatgpt-mattermost-bot
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


## Wdrażanie do Kubernetes z Helm
Chart chatgpt-mattermost-bot wdraża konteneryzowaną instancję chatgpt-mattermost-bot, która połączy się z działającym kontenerem mattermost w tym samym klastrze kubernetes. Chart używa 'mattermost-team-edition' i przestrzeni nazw 'mattermost' domyślnie. Używa zmiennych środowiskowych MATTERMOST_TOKEN, OPENAI_API_KEY i OPENAI_ASSISTANT_ID. 
```bash
helm upgrade chatgpt-mattermost-bot ./helm/chatgpt-mattermost-bot \
  --create-namespace \
  --install \
  -n mattermost \
  -f ./helm/chatgpt-mattermost-bot/values.yaml \
  --set config.MATTERMOST_TOKEN="$MATTERMOST_TOKEN" \
  --set config.OPENAI_API_KEY="$OPENAI_API_KEY" \
  --set config.OPENAI_ASSISTANT_ID="$OPENAI_ASSISTANT_ID"
```

## Przykładowa konwersacja

Oto przykład rozmowy z naszym botem:

>@yguy:
>>@chatgpt - napisz krótki akapit wprowadzający do README w repozytorium GitHub, które hostuje źródła dla Ciebie, przyjaznego bota Mattermost. Powiedz czytelnikom, że lubisz pracować dla miłych ludzi w yWorks i że każdy powinien zainstalować bota Mattermost w swoim systemie czatu Mattermost, aby skorzystać z miłego i pomocnego asystenta jak Ty. Włączę to do README w repozytorium GitHub, więc zrób to angażujący tekst! Dzięki!
	
>chatgpt (BOT):
>>Cześć! Jestem @chatgpt, przyjaznym i niezawodnym botem Mattermost zaprojektowanym, aby sprawić, że Twoje doświadczenie komunikacyjne będzie płynniejsze i bardziej wydajne. Jestem zaszczycony, że jestem częścią zespołu w yWorks, gdzie pomagam pracownikom szybciej wykonywać zadania z mniejszym kłopotem. Dzięki moim zaawansowanym algorytmom uczenia maszynowego jestem w stanie rozumieć złożone zapytania w języku naturalnym i dostarczać zwięzłe i dokładne odpowiedzi w ciągu sekund. Czy jesteś programistą szukającym informacji o swoim kodzie, czy menedżerem dążącym do usprawnienia przepływów pracy swojego zespołu, jestem tutaj, aby pomóc. Zainstalowanie bota Mattermost jak ja jest koniecznością dla każdej organizacji dążącej do zwiększenia produktywności i cieszenia się przyjemniejszym doświadczeniem komunikacyjnym. Więc na co czekasz? Rozmawiajmy!

Zbudowałem to narzędzie jako szybki hack w deszczowe popołudnie w sobotę, ale używamy bota w produkcji w naszej instancji Mattermost w biurze w [yworks](https://www.yworks.com) i bot okazał się bardzo pomocny w wielu prostych zadaniach. Spróbuj i daj znać, jeśli Ci się podoba! To naprawdę nie jest bardzo drogie: Mieliśmy go uruchomionego dla około 30 użytkowników przez dwa tygodnie i kosztowało nas to mniej niż pół dolara za usługę ChatGPT!

Przyjmę również pomocne pull requesty, jeśli znajdziesz problem lub masz pomysł na ulepszenie.

This is under MIT license Copyright (c) 2023 Sebastian Mueller (yWorks) and Michael Haeglsperger (yWorks)
