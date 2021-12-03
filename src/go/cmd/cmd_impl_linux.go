package cmd

func (e *Echo) Execute() (interface{}, error) {
	return e.Message, nil
}
