# ![shupload logo](static/shupload-32x32.png?raw=true) shupload

**shupload** is free software that provides quick image hosting and sharing through a self-run HTTP service written in [Go](https://golang.org).

![screenshot of shupload](screenshot.gif?raw=true)

## Features
  * Free software!
  * URL shortening such as `website.net/Xo3lgeZ9`
  	* Customizable to be any array of characters or strings!
  * Mobile support
  * Image uploading via:
    * File open dialog
    * Drag'n'drop
    * Clipboard pasting
    * Camera capturing
    * Display/Window capturing for browsers implementing `MediaDevices.getDisplayMedia()`
  * Customizable via HTML templates and CSS.
  * Works without JavaScript, albeit with a degraded experience and no features beyond standard input-based file upload.
  * Metadata such as the filename, upload date, and mimetype are stored in an adjacent JSON metadata file, meaning the original file's name is preserved for downloading.
  * Zooming with pixel-perfect upscaling for modern browsers.
  
## Installation
To install you must have at least have **Go 1.11**. In the future binaries may be provided but until then you can simply issue the following:

```
~> git clone https://github.com/kettek/shupload
~> cd shupload/src && go build -o ../shupload
~> cd .. && ./shupload
```

## Running
Running is simply a matter of running `shupload` in a directory relative to the `static` and `templates` directories. Doing so will start an HTTP service running at [127.0.0.1:8088/](http://127.0.0.1:8088/). Additional configuration can be provided as per the following section.

## Configuration
shupload configuration can be done through a JSON file named **config.json** relative to the running directory of the program. 

The possible options are:

| Key              | Type      | Default         |   Description      |
|------------------|-----------|-----------------|--------------------|
| Address          | string    | ":8088"         | The address and port for HTTP listening. |
| DatabaseLocation | string    | "db"            | The directory name/location of the database storage. |
| EntryKeyRunes    | []string  | `["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]` | The runes from which to randomly generate an entry's key. |
| EntryKeyLength   | int       | 8               | How many runes an entry should consist of. |

## Storage format
shupload uses a simple file-based storage provided by `DataBase_filestore.go`. It writes uploaded image data under the `db` directory and the accompanying metadata (upload time, filename, mimetype) entries in the `db.json` file.

Alternative database solutions could be created by replicating the base API of the filestore implementation.

## nginx Reverse Proxy
Running shupload behind an nginx proxy is a fairly easy matter. Depending on your server(s') setup, a location entry such as the one below will allow shupload to work without error:

```
location /upload/ {
	proxy_pass http://127.0.0.1:8088/;
	proxy_redirect ~^/(.*) https://<mydomain>/upload/$1;
}
```

Additionally, nginx limits file uploads to 1M so you may wish to place the following line in either the location, server, or global sections:

```
	client_max_body_size 100M;
```
