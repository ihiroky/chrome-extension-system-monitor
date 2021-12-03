package cmd

type Command interface {
	Type() string
	Execute() (interface{}, error)
}

const CommandTypeEcho = "echo"

type Echo struct {
	Message string
}

func (e *Echo) Type() string {
	return CommandTypeEcho
}
