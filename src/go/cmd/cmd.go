package cmd

import (
	"runtime"

	"github.com/pkg/errors"
)

type Command interface {
	Type() string
	Execute() (interface{}, error)
}

const CommandTypeEcho = "echo"
const CommandTypeOS = "os"
const CommandTypeCpu = "cpu"
const CommandTypeMemory = "memory"
const CommandTypeDisk = "disk"
const CommandTypeNetwork = "network"

var cmdFactry map[string]func() Command

func init() {
	cmdFactry = map[string]func() Command{}
	cmdFactry[CommandTypeEcho] = func() Command { return &Echo{} }
	cmdFactry[CommandTypeOS] = func() Command { return &OS{} }
	cmdFactry[CommandTypeCpu] = func() Command { return &Cpu{} }
	cmdFactry[CommandTypeMemory] = func() Command { return &Memory{} }
	cmdFactry[CommandTypeDisk] = func() Command { return &Disk{} }
	cmdFactry[CommandTypeNetwork] = func() Command { return &Network{} }
}

func GetCommand(t string) (Command, error) {
	f, ok := cmdFactry[t]
	if !ok {
		return nil, errors.New("Unknown type: " + t)
	}
	return f(), nil
}

type Echo struct {
	Message string
}

func (e *Echo) Type() string {
	return CommandTypeEcho
}

func (e *Echo) Execute() (interface{}, error) {
	return e.Message, nil
}

type OS struct{}

func (o *OS) Type() string {
	return CommandTypeOS
}

func (o *OS) Execute() (interface{}, error) {
	return runtime.GOOS, nil
}

type Cpu struct{}

func (c *Cpu) Type() string {
	return CommandTypeCpu
}

type Memory struct{}

func (m *Memory) Type() string {
	return CommandTypeMemory
}

type Disk struct{}

func (d *Disk) Type() string {
	return CommandTypeDisk

}

type Network struct{}

func (n *Network) Type() string {
	return CommandTypeNetwork
}
