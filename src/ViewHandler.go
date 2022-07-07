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
	template         *template.Template
	multipleTemplate *template.Template
}
type FileMetadata struct {
	URI             string
	Filename        string
	EscapedFilename string
	Mimetype        string
	Entryname       string
	CreationTime    string
}
type ResponseData struct {
	Key          string
	Files        []FileMetadata
	CreationTime string
}

func (h *ViewHandler) ServeHTTP(res http.ResponseWriter, req *http.Request) {
	var key string
	var filename string
	key, req.URL.Path = ShiftPath(req.URL.Path)
	filename, req.URL.Path = ShiftPath(req.URL.Path)

	escapedFilename, err := url.PathUnescape(filename)
	if err != nil {
		http.Error(res, "Failed to unescape filename", http.StatusInternalServerError)
		return
	}

	entries, err := AppInstance.DataBase.GetEntries(key)
	if err != nil || len(entries) < 1 {
		// TODO: 404 redirect!
		http.Error(res, "No such files!", http.StatusNotFound)
		return
	}

	responseData := ResponseData{
		Key:          key,
		Files:        []FileMetadata{},
		CreationTime: entries[0].CreationTime.Format("2006-01-02 15:04:05"),
	}

	for _, entry := range entries {
		if escapedFilename == "" {
			// If we're getting the metadata for an upload
			data := FileMetadata{
				URI:             path.Join(key, url.PathEscape(entry.Filename)),
				Filename:        entry.Filename,
				EscapedFilename: url.PathEscape(entry.Filename),
				Mimetype:        entry.Mimetype,
				Entryname:       key,
				CreationTime:    entry.CreationTime.Format("2006-01-02 15:04:05"),
			}
			responseData.Files = append(responseData.Files, data)
		} else if escapedFilename == entry.Filename {
			// If we're directly accessing a specific file
			data, err := AppInstance.DataBase.GetEntryStream(entry.Key)
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
		}
	}

	// If we've populated the response data, render the template
	//  -- These templates could probably be combined and just one used
	if len(responseData.Files) > 1 {
		err = h.multipleTemplate.Execute(res, responseData)
	} else if len(responseData.Files) == 1 {
		err = h.template.Execute(res, responseData.Files[0])
	}
	if err != nil {
		http.Error(res, "Failed to execute template", http.StatusInternalServerError)
		log.Print(err)
		return
	}
}

func (h *ViewHandler) LoadTemplate() error {
	// These templates could probably be combined and just one used
	viewTemplate, err := ioutil.ReadFile("templates/view.tmpl")
	if err != nil {
		return err
	}
	multipleTemplate, err := ioutil.ReadFile("templates/viewMultiple.tmpl")
	if err != nil {
		return err
	}

	h.template, err = template.New("view").Funcs(template.FuncMap{
		"regexMatch": func(r, s string) bool {
			matched, _ := regexp.Match(r, []byte(s))
			return matched
		},
	}).Parse(string(viewTemplate))
	if err != nil {
		return err
	}
	h.multipleTemplate, err = template.New("viewMultiple").Funcs(template.FuncMap{
		"regexMatch": func(r, s string) bool {
			matched, _ := regexp.Match(r, []byte(s))
			return matched
		},
	}).Parse(string(multipleTemplate))
	if err != nil {
		return err
	}
	return nil
}
