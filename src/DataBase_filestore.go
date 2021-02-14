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
/*
This file implements a very basic file-based storage system. It simply puts the files in a directory and updates a JSON file for the accompanying metadata.
*/
package main

import (
  "encoding/json"
  "mime"
  "path/filepath"
  //
  "log"
  "io"
  "io/ioutil"
  "time"
  "mime/multipart"
  "path"
  "os"
)

type FileDriver struct {
  root string
}
func NewFileDriver(db string) (f *FileDriver, err error) {
  f = &FileDriver{
    root: db,
  }
  if _, err = os.Stat(db); os.IsNotExist(err) {
    err = os.Mkdir(db, 0777)
  }
  return
}
func (fd *FileDriver) Write(key string, r io.ReadCloser) (err error) {
  f, err := os.Create(path.Join(fd.root, key))
  if err != nil {
    return
  }
  _, err = io.Copy(f, r)
  if err != nil {
    return
  }
  
  info,err := os.Stat(path.Join(fd.root, key))
  var kbLimit int64 = 1024
  var fileSize int64 = info.Size()
  kbSize := float64(fileSize) / float64(kbLimit)

  if (int(kbSize) > AppInstance.Config.MaxFileSize) {
    os.Remove(path.Join(fd.root, key))
    if err != nil {
      return
    }
  }
  
  return
}

func (fd *FileDriver) ReadStream(key string) (r io.ReadSeeker, err error) {
  r, err = os.Open(path.Join(fd.root, key))
  return
}

type MetaDriver struct {
  root string
  file *os.File
  db map[string]DataBaseEntry
}
func NewMetaDriver(db string) (m *MetaDriver, err error) {
  m = &MetaDriver{
    root: db,
  }
  m.file, err = os.OpenFile(m.root, os.O_RDWR|os.O_CREATE, 0644)
  if err != nil {
    return
  }
  bytes, _ := ioutil.ReadAll(m.file)

  m.db = make(map[string]DataBaseEntry)
  json.Unmarshal([]byte(bytes), &m.db)
  log.Print(m.db)

  return
}
func (m *MetaDriver) Get(key string) (entry DataBaseEntry, err error) {
  entry, ok := m.db[key]
  if !ok {
    // TODO: return error (does not exist)
  }
  return
}
func (m *MetaDriver) Write(key string, entry DataBaseEntry) (err error) {
  m.db[key] = entry
  err = m.Sync()
  return
}

func (m *MetaDriver) Remove(key string) (err error) {
  delete(m.db, key)
  err = m.Sync()
  return
}

func (m *MetaDriver) Sync() (err error) {
  var data []byte
  data, err = json.Marshal(m.db)
  if err != nil {
    return
  }
  _, err = m.file.Seek(0, 0)
  if err != nil {
    return
  }
  m.file.Write(data)
  return
}

type DataBase struct {
  fileDB *FileDriver
  metaDB *MetaDriver
}

func (d *DataBase) Init() (err error) {
  d.fileDB, err = NewFileDriver(AppInstance.Config.DatabaseLocation)
  if err != nil {
    return
  }
  d.metaDB, err = NewMetaDriver(AppInstance.Config.DatabaseLocation+".json")
  return
}

func (d *DataBase) CreateEntry(r multipart.File, h *multipart.FileHeader) (entry DataBaseEntry, key string, err error) {
  key = d.GetKey()
  
  if (len(h.Filename) > AppInstance.Config.MaxFilenameLength) {
    return
  }
  
  entry = DataBaseEntry{
    CreationTime: time.Now(),
    Filename: h.Filename,
    Mimetype: mime.TypeByExtension(filepath.Ext(h.Filename)),
  }
  err = d.metaDB.Write(key, entry)
  if err != nil {
    return
  }
  err = d.fileDB.Write(key, r)
  if err != nil {
    d.metaDB.Remove(key)
    return
  }
  return
}

func (d *DataBase) GetEntry(key string) (entry DataBaseEntry, err error) {
  entry, err = d.metaDB.Get(key)
  return
}

func (d *DataBase) GetEntryStream(key string) (r io.ReadSeeker, err error) {
  r, err = d.fileDB.ReadStream(key)
  return
}

func (d *DataBase) KeyExists(key string) bool {
  return false
  //return d.fileDB.Has(key)
}
