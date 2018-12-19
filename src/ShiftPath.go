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

import "strings"
import "path"

func ShiftPath(p string) (head, tail string) {
  p = path.Clean("/" + p)

  i := strings.Index(p[1:], "/") + 1
  if i <= 0 {
    return p[1:], "/"
  }

  return p[1:i], p[i:]
}
