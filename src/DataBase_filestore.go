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

	"fmt"
	"io"
	"io/ioutil"
	"mime/multipart"
	"os"
	"path"
	"time"
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
	return
}
func (fd *FileDriver) ReadStream(key string) (r io.ReadSeeker, err error) {
	r, err = os.Open(path.Join(fd.root, key))
	return
}

type MetaDriver struct {
	root string
	file *os.File
	db   map[string][]DataBaseEntry
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

	// Let's see if the database is olde and needs to be upgraded.
	oldDB := make(map[string]DataBaseEntry)
	if err := json.Unmarshal([]byte(bytes), &oldDB); err == nil {
		m.db = make(map[string][]DataBaseEntry)
		for k, e := range oldDB {
			m.db[k] = []DataBaseEntry{e}
		}
		err = m.Sync()
	} else {
		m.db = make(map[string][]DataBaseEntry)
		json.Unmarshal([]byte(bytes), &m.db)
	}
	return
}
func (m *MetaDriver) Get(key string) (entries []DataBaseEntry, err error) {
	entries, ok := m.db[key]
	if !ok {
		err = fmt.Errorf("file not found: %s", key)
	}
	return
}
func (m *MetaDriver) Write(key string, entries []DataBaseEntry) (err error) {
	m.db[key] = entries
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
	d.metaDB, err = NewMetaDriver(AppInstance.Config.DatabaseLocation + ".json")
	return
}
func (d *DataBase) CreateEntries(h []*multipart.FileHeader) (entries []DataBaseEntry, key string, err error) {
	entries = make([]DataBaseEntry, len(h))
	key = d.GetKey()

	for i, header := range h {
		entryKey := d.GetKey()
		if len(header.Filename) > AppInstance.Config.MaxFilenameLength {
			err = fmt.Errorf("file name length limit exceeded: %d > %d", len(header.Filename), AppInstance.Config.MaxFilenameLength)
			return
		}

		var kbLimit int64 = 1024
		var fileSize int64 = header.Size
		kbSize := float64(fileSize) / float64(kbLimit)

		if int(kbSize) > AppInstance.Config.MaxFileSize {
			err = fmt.Errorf("file size limit exceeded: %d > %d", int(kbSize), AppInstance.Config.MaxFileSize)
			return
		}

		entry := DataBaseEntry{
			Key:          entryKey,
			CreationTime: time.Now(),
			Filename:     header.Filename,
			Mimetype:     mime.TypeByExtension(filepath.Ext(header.Filename)),
		}

		entries[i] = entry
		file, _ := header.Open()
		err = d.fileDB.Write(entryKey, file)
	}
	err = d.metaDB.Write(key, entries)
	if err != nil {
		return
	}

	return
}
func (d *DataBase) GetEntries(key string) (entries []DataBaseEntry, err error) {
	entries, err = d.metaDB.Get(key)
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
