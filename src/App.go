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
  "time"
  "math/rand"
)

type App struct {
  Config AppConfig
  DataBase DataBase
  UploadHandler UploadHandler
  StaticHandler StaticHandler
  ViewHandler ViewHandler
}

/* Global AppInstance used by DataBase and others. */
var AppInstance App

func (a *App) Init() (err error) {
  rand.Seed(time.Now().UnixNano())

  a.Config = AppConfig{
    EntryKeyRunes: []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"},
    EntryKeyLength: 8,
    Address: ":8088",
    DatabaseLocation: "db",
    MaxFilenameLength: 100,
    MaxFileSize: 20000,
  }

  err = AppInstance.Config.Load("config.json")
  if err != nil {
    return
  }

  err = a.DataBase.Init()
  if err != nil {
    return
  }
  err = a.UploadHandler.LoadTemplate()
  if err != nil {
    return
  }
  err = a.ViewHandler.LoadTemplate()
  if err != nil {
    return
  }

  return
}

func (a *App) ServeHTTP(res http.ResponseWriter, req *http.Request) {
  head, newURLPath := ShiftPath(req.URL.Path)

  switch head {
  case "":
    a.UploadHandler.ServeHTTP(res, req)
  case "static":
    req.URL.Path = newURLPath
    a.StaticHandler.ServeHTTP(res, req)
  default:
    a.ViewHandler.ServeHTTP(res, req)
  }
  return
}
