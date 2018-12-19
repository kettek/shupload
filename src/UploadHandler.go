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
  "net/http"
  "html/template"
  "log"
  "io/ioutil"
  "fmt"
)


type UploadHandler struct {
  template *template.Template
}

func (h *UploadHandler) ServeHTTP(res http.ResponseWriter, req *http.Request) {
  _, req.URL.Path = ShiftPath(req.URL.Path)

  if (req.Method == "GET") {
    err := h.template.Execute(res, struct{}{})
    if err != nil {
      http.Error(res, "Failed to execute template", http.StatusInternalServerError)
      log.Print(err)
    }
  } else if (req.Method == "POST") {
    req.ParseMultipartForm(32 << 20)
    file, handler, err := req.FormFile("file")
    if err != nil {
      log.Print(err)
      return
    }
    _, key, err := AppInstance.DataBase.CreateEntry(file, handler)
    if err != nil {
      log.Print(err)
      http.Error(res, "Failed to create entry", http.StatusInternalServerError)
      return
    }
    http.Redirect(res, req, key, http.StatusSeeOther)
  } else {
    http.Error(res, "Method Not Allowed", http.StatusMethodNotAllowed)
  }
}

func (h *UploadHandler) queryParams(w http.ResponseWriter, r *http.Request) {
  reqBody, err := ioutil.ReadAll(r.Body)
  if err != nil {
    log.Fatal(err)
  }
  fmt.Printf("%s", reqBody)
  http.Error(w, "Method Not Implemented", http.StatusNotImplemented)
}

func (h *UploadHandler) LoadTemplate() error {
  b, err := ioutil.ReadFile("templates/upload.tmpl")
  if err != nil {
    return err
  }
  h.template, err = template.New("upload").Parse(string(b))
  if err != nil {
    return err
  }
  return nil
}
