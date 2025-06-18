# Figma MCP Server Setup

Bu dosya Figma MCP sunucusunun nasıl kurulacağını ve kullanılacağını açıklar.

## Kurulum

### 1. Figma Access Token Alma

1. [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens) sayfasına gidin
2. "Personal access tokens" bölümünde yeni bir token oluşturun
3. Token'ı güvenli bir yerde saklayın

### 2. Environment Variable Ayarlama

`.cursor/mcp.json` dosyasında `<your-figma-access-token>` kısmını gerçek token'ınızla değiştirin:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["scripts/mcp-figma.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
  }
}
```

### 3. Test Etme

Figma MCP sunucusunu test etmek için:

```bash
npm run mcp:figma
```

## Kullanılabilir Araçlar

### 1. `get_figma_file`
Figma dosyasının genel bilgilerini ve yapısını getirir.

**Parametreler:**
- `fileKey`: Figma URL'sindeki dosya anahtarı

### 2. `get_figma_components`
Figma dosyasındaki tüm bileşenleri listeler.

**Parametreler:**
- `fileKey`: Figma URL'sindeki dosya anahtarı

### 3. `get_figma_styles`
Figma dosyasındaki stilleri (renkler, tipografi, efektler) getirir.

**Parametreler:**
- `fileKey`: Figma URL'sindeki dosya anahtarı

### 4. `export_figma_images`
Figma node'larından görsel export eder.

**Parametreler:**
- `fileKey`: Figma URL'sindeki dosya anahtarı
- `nodeIds`: Export edilecek node ID'leri dizisi
- `format`: Export formatı (jpg, png, svg, pdf) - varsayılan: png
- `scale`: Export ölçeği (1-4) - varsayılan: 1

## Figma File Key Nasıl Bulunur

Figma URL'si şu formattadır:
```
https://www.figma.com/file/[FILE_KEY]/[FILE_NAME]
```

Örnek:
```
https://www.figma.com/file/ABC123DEF456/My-Design-System
```

Bu örnekte `FILE_KEY` = `ABC123DEF456`

## Örnek Kullanım

Cursor'da MCP bağlantısı kurulduktan sonra şu şekilde kullanabilirsiniz:

```
@figma get_figma_file fileKey="ABC123DEF456"
```

```
@figma get_figma_components fileKey="ABC123DEF456"
```

## Sorun Giderme

### Token Hatası
Eğer "FIGMA_ACCESS_TOKEN environment variable is required" hatası alıyorsanız:
1. Token'ın doğru ayarlandığından emin olun
2. Token'ın geçerli olduğunu kontrol edin
3. Cursor'ı yeniden başlatın

### API Hatası
Eğer "Figma API error" hatası alıyorsanız:
1. File key'in doğru olduğunu kontrol edin
2. Dosyaya erişim izninizin olduğunu kontrol edin
3. Token'ın geçerli olduğunu kontrol edin 