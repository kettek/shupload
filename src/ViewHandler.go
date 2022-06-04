/*
Copyright 2018-2019 Ketchetwahmeegwun T. Southall

This file is part of shupload.

shupload is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

shupload is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with shupload.  If not, see <https://www.gnu.org/licenses/>.
*/
package main

import (
	"html/template"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strconv"
)

type ViewHandler struct {
	template *template.Template
}

func (h *ViewHandler) ServeHTTP(res http.ResponseWriter, req *http.Request) {
	var key string
	var filename string
	key, req.URL.Path = ShiftPath(req.URL.Path)
	filename, req.URL.Path = ShiftPath(req.URL.Path)

	escapedFilename, err := url.QueryUnescape(filename)
	if err != nil {
		http.Error(res, "Failed to unescape filename", http.StatusInternalServerError)
		return
	}

	entry, err := AppInstance.DataBase.GetEntry(key)
	if err != nil {
		// TODO: 404 redirect!
		http.Error(res, "No such file!", http.StatusNotFound)
		return
	}

	if escapedFilename == "" {
		data := struct {
			URI             string
			Filename        string
			EscapedFilename string
			Mimetype        string
			Entryname       string
			CreationTime    string
		}{
			URI:             path.Join(key, url.QueryEscape(entry.Filename)),
			Filename:        entry.Filename,
			EscapedFilename: url.QueryEscape(entry.Filename),
			Mimetype:        entry.Mimetype,
			Entryname:       key,
			CreationTime:    entry.CreationTime.Format("2006-01-02 15:04:05"),
		}
		err := h.template.Execute(res, data)
		if err != nil {
			http.Error(res, "Failed to execute template", http.StatusInternalServerError)
			log.Print(err)
			return
		}
	} else if escapedFilename == entry.Filename {
		data, err := AppInstance.DataBase.GetEntryStream(key)
		if err != nil {
			http.Error(res, "Data file missing", http.StatusInternalServerError)
			return
		}
		// Get our length
		length, err := data.Seek(0, io.SeekEnd)
		if err != nil {
			http.Error(res, "Error while seeking to end of data", http.StatusInternalServerError)
			return
		}
		_, err = data.Seek(0, 0)
		if err != nil {
			http.Error(res, "Error while seeking to start of data", http.StatusInternalServerError)
			return
		}

		res.Header().Set("Content-Disposition", "attachment; filename="+filename)
		res.Header().Set("Content-Type", entry.Mimetype)
		res.Header().Set("Content-Length", strconv.FormatInt(length, 10))
		io.Copy(res, data)
	} else {
		http.Error(res, "wat u doin", http.StatusBadRequest)
	}
}

func (h *ViewHandler) LoadTemplate() error {
	b, err := ioutil.ReadFile("templates/view.tmpl")
	if err != nil {
		return err
	}
	h.template, err = template.New("view").Funcs(template.FuncMap{
		"regexMatch": func(r, s string) bool {
			matched, _ := regexp.Match(r, []byte(s))
			if matched {
				return true
			}
			return false
		},
	}).Parse(string(b))
	if err != nil {
		return err
	}
	return nil
}
