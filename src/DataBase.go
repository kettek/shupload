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
  "math/rand"
  "strings"
)

/*
TODO: DataBase should probably be made to use channels for updating.
TODO: Make the DataBase interface more generic.
*/

func (d *DataBase) GenerateKey() string {
  b := make([]string, AppInstance.Config.EntryKeyLength)
  for i := range b {
    b[i] = AppInstance.Config.EntryKeyRunes[rand.Intn(len(AppInstance.Config.EntryKeyRunes))]
  }
  return strings.Join(b, "")
}

func (d *DataBase) GetKey() (key string) {
  key = d.GenerateKey()
  for d.KeyExists(key) {
    key = d.GenerateKey()
  }
  return
}
