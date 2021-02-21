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
  "os"
  "io/ioutil"
  "encoding/json"
)

type AppConfig struct {
  EntryKeyRunes []string `json:"EntryKeyRunes"`
  EntryKeyLength int `json:"EntryKeyLength"`
  Address string `json:"Address"`
  DatabaseLocation string `json:"DatabaseLocation"`
  MaxFilenameLength int `json:"MaxFilenameLength"`
  MaxFileSize int `json:"MaxFileSize"`
}

func (a *AppConfig) Load(filename string) (err error) {
  file, err := os.OpenFile(filename, os.O_RDWR|os.O_CREATE, 0644)
  if err != nil {
    return
  }
  bytes, _ := ioutil.ReadAll(file)

  json.Unmarshal([]byte(bytes), &a)
  return
}
