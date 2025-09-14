# CSSynergyX File Glance

A **page extension add-in** for Exact Synergy Enterprise that adds inline file viewing capabilities to attachment tables. This extension enhances the user experience by allowing users to preview documents directly within the Synergy interface without downloading them.

## Features

- **In-place File Preview**: View files directly in a modal overlay without leaving the current page
- **Multi-format Support**: Supports various file formats including:
  - **Images**: PNG, JPG, JPEG, GIF, BMP, WebP, SVG
  - **Documents**: DOCX (Word documents)
  - **Spreadsheets**: XLSX, XLS (Excel files)
  - **PDFs**: PDF documents
- **Interactive Image Viewer**: 
  - Zoom in/out functionality
  - Pan and drag to navigate large images
  - Fit to window and actual size options
  - Keyboard shortcuts for navigation
- **Responsive Design**: Modal viewer adapts to different screen sizes
- **Fallback Support**: Uses CDN resources with local fallbacks for reliability

## What It Does

File Glance seamlessly integrates with Exact Synergy Enterprise by adding "View" buttons to attachment tables. When users click these buttons, files open in an elegant modal overlay with format-specific viewers - no downloads required.

The solution consists of a C# page extension that automatically enhances WflRequest pages and a JavaScript library that handles the file preview functionality with support for images, documents, and spreadsheets.

## Installation

### Prerequisites
- Exact Synergy Enterprise 503 or later
- .NET Framework 4.7 or later

### Setup Steps

1. **Build the Extension**:
   ```bash
   # Open the solution in Visual Studio
   # Build the project in Release mode
   ```

2. **Deploy Files**:
   - The compiled DLL will automatically copy to `C:\Exact Synergy Enterprise 503x\BIN\` (configured in post-build event)
   - Copy the `setup/docs/` folder contents to your Synergy web server's `/docs/` directory
   - Copy the `setup/xml/` folder contents to your Synergy web server's `/xml/` directory

## Usage

Once installed, the extension automatically:

1. **Detects attachment tables** on WflRequest pages
2. **Adds "View" buttons** next to existing "Delete" buttons for each attachment
3. **Enables file preview** when users click the "View" button

### Keyboard Shortcuts (Image Viewer)
- `Escape`: Close the modal
- `+` or `=`: Zoom in
- `-` or `_`: Zoom out  
- `0`: Reset to actual size
- `F`: Fit to window

## File Structure

```
CSSynergyX.FileGlance/
├── CSSynergyX.FileGlance.slnx              # Solution file
├── LICENSE.txt                             # GPL v3 License
├── README.md                              # This file
├── CSSynergyX.FileGlance.PageExtension/   # C# Extension
│   ├── WflRequest.cs                      # Main extension class
│   ├── Properties/AssemblyInfo.cs         # Assembly metadata
│   └── *.csproj                          # Project file
└── setup/                                 # Deployment files
    ├── docs/                              # Web assets
    │   ├── CSSynergyX.FileGlance.js      # Main JavaScript library
    │   ├── docx-preview.js               # DOCX viewer
    │   ├── jszip.min.js                  # ZIP handling
    │   └── xlsx.full.min.js              # Excel processing
    └── xml/
        └── Custom.CSSynergyX.FileGlance.xml # Synergy configuration
```

## Browser Compatibility

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Features Used**: ES5 JavaScript, CSS3, HTML5 Canvas
- **Fallbacks**: Graceful degradation for unsupported browsers

## Development

### Building from Source

1. Clone the repository
2. Open `CSSynergyX.FileGlance.slnx` in Visual Studio
3. Build the project in Release mode
4. Copy all folders under the "setup" directory to your Synergy web server

## Credits

This project uses the following open-source libraries:

- **[SheetJS](https://github.com/SheetJS/sheetjs)** - Community Edition for parsing and writing spreadsheet files
- **[docxjs](https://github.com/VolodymyrBaydalka/docxjs/)** - JavaScript library for rendering DOCX documents in the browser
- **[JSZip](https://github.com/Stuk/jszip)** - JavaScript library for creating, reading and editing ZIP files

We extend our gratitude to the maintainers and contributors of these excellent libraries that make this project possible.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE.txt](LICENSE.txt) file for details.

## Support

This is an open-source project. For issues, feature requests, or contributions, please refer to the project repository.

## Version History

- **v1.0.0** (2025): Initial release
  - Basic file preview functionality
  - Support for images, DOCX, XLSX, and PDF files
  - Interactive image viewer with zoom and pan
  - Integration with Exact Synergy Enterprise

---

**Note**: This extension is designed specifically for Exact Synergy Enterprise and requires the appropriate Synergy environment to function properly.
