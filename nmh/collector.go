package main

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"log"
	"os"
)

func writeJSON(writer *bufio.Writer, payload []byte) error {
	length := len(payload)
	if err := binary.Write(writer, binary.LittleEndian, int32(length)); err != nil {
		return err
	}

	for head := 0; head < length; {
		n, err := writer.Write(payload[head:])
		if n == 0 && err != nil {
			return err
		}
		head += n
	}
	writer.Flush()
	return nil
}

func readJSON(reader *bufio.Reader) ([]byte, error) {
	var length uint32
	if err := binary.Read(reader, binary.LittleEndian, &length); err != nil {
		return nil, err
	}
	payload := make([]byte, length)
	if _, err := io.ReadFull(reader, payload); err != nil {
		return nil, err
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

const echoType = "echo"

type Echo struct {
	Message string
}

func (e *Echo) Type() string {
	return echoType
}

func (e *Echo) Execute() (interface{}, error) {
	return e.Message, nil
}

func parseJSON(data []byte) (Command, error) {
	t := Type{}
	if err := json.Unmarshal(data, &t); err != nil {
		return nil, err
	}
	switch t.Type {
	case echoType:
		var echo Echo
		if err := json.Unmarshal(data, &echo); err != nil {
			return nil, err
		}
		return &echo, nil
	default:
		return nil, errors.New("Unexpected type: " + t.Type)
	}
}

func process(inCh, outCh chan interface{}) {
	for {
		msg, ok := <-inCh
		if !ok {
			log.Println("inCh is closed.")
			close(outCh)
			break
		}

		// Collect metrics

		outCh <- msg
	}
}

func main() {
	stdin := bufio.NewReader(os.Stdin)
	stdout := bufio.NewWriter(os.Stdout)

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
	result, err := cmd.Execute()
	if err != nil {
		log.Fatalf("Failed to execute command %s: %v", cmd.Type(), err)
		return
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
