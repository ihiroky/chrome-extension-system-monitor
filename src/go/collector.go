package main

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"io"
	"log"
	"os"

	"github.com/ihiroky/chrome-extension-system-monitor/cmd"
	"github.com/pkg/errors"
)

func writeJSON(writer *bufio.Writer, payload []byte) error {
	length := len(payload)
	if err := binary.Write(writer, binary.LittleEndian, int32(length)); err != nil {
		return errors.WithStack(err)
	}

	for head := 0; head < length; {
		n, err := writer.Write(payload[head:])
		if n == 0 && err != nil {
			return errors.WithStack(err)
		}
		head += n
	}
	writer.Flush()
	return nil
}

func readJSON(reader *bufio.Reader) ([]byte, error) {
	var length uint32
	if err := binary.Read(reader, binary.LittleEndian, &length); err != nil {
		return nil, errors.WithStack(err)
	}
	payload := make([]byte, length)
	if _, err := io.ReadFull(reader, payload); err != nil {
		return nil, errors.WithStack(err)
	}
	return payload, nil
}

type Type struct {
	Type string
}

type Command interface {
	Type() string
	Execute() (interface{}, error)
}

type CommandFactory func() Command

func parseJSON(data []byte) (Command, error) {
	t := Type{}
	if err := json.Unmarshal(data, &t); err != nil {
		return nil, errors.WithStack(err)
	}
	c, err := cmd.GetCommand(t.Type)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(data, c); err != nil {
		return nil, errors.WithStack(err)
	}
	return c, nil
}

func main() {
	stdin := bufio.NewReader(os.Stdin)
	stdout := bufio.NewWriter(os.Stdout)

	for {
		input, err := readJSON(stdin)
		if err != nil {
			log.Fatalf("Failed to read frame: %v\n", err)
			return
		}
		cmd, err := parseJSON(input)
		if err != nil {
			log.Fatalf("Failed to parse JSON: %v\n", err)
			return
		}
		stat, err := cmd.Execute()
		if err != nil {
			log.Fatalf("Failed to execute command %s: %v", cmd.Type(), err)
			return
		}
		result := struct {
			Type string      `json:"type"`
			Stat interface{} `json:"stat"`
		}{
			Type: cmd.Type(),
			Stat: stat,
		}
		output, err := json.Marshal(result)
		if err != nil {
			log.Fatalf("Failed to marshal object: %v, %v", err, output)
		}
		if err := writeJSON(stdout, output); err != nil {
			log.Fatalf("Failed to write JSON: %v", err)
			return
		}
	}
}
