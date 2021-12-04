package cmd

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/errors"
)

type CpuUtilization struct {
	Name      string `json:"name"`
	User      uint64 `json:"user"`
	Nice      uint64 `json:"nice"`
	System    uint64 `json:"system"`
	Idle      uint64 `json:"idle"`
	IoWait    uint64 `json:"iowait"`
	Irq       uint64 `json:"irq"`
	Softirq   uint64 `json:"softirq"`
	Steal     uint64 `json:"steal"`
	Guest     uint64 `json:"guest"`
	GuestNice uint64 `json:"guest_nice"`
	Clock     uint64 `json:"clock"`
}

func (c *CpuUtilization) diff(base *CpuUtilization) CpuUtilization {
	return CpuUtilization{
		Name:      c.Name,
		User:      c.User - base.User,
		Nice:      c.Nice - base.Nice,
		System:    c.System - base.System,
		Idle:      c.Idle - base.Idle,
		IoWait:    c.IoWait - base.IoWait,
		Irq:       c.Irq - base.Irq,
		Softirq:   c.Softirq - base.Irq,
		Steal:     c.Steal - base.Steal,
		Guest:     c.Guest - base.Guest,
		GuestNice: c.GuestNice - base.GuestNice,
	}
}

type CpuStat struct {
	Time    time.Time        `json:"time"`
	All     CpuUtilization   `json:"all"`
	Cores   []CpuUtilization `json:"cores"`
	Running uint64           `json:"running"`
	Blocked uint64           `json:"blocked"`
}

type MemoryStat struct {
	Time      time.Time `json:"time"`
	Total     uint64    `json:"total"`
	Used      uint64    `json:"used"`
	Free      uint64    `json:"free"`
	Shared    uint64    `json:"shared"`
	Buffers   uint64    `json:"buffers"`
	Cache     uint64    `json:"cache"`
	Available uint64    `json:"available"`
}

type DiskUtilization struct {
	Name       string `json:"name"`
	ReadBytes  uint64 `json:"rbyte"`
	ReadTicks  uint64 `json:"rtick"`
	WriteBytes uint64 `json:"wbyte"`
	WriteTicks uint64 `json:"wtick"`
	IoTicks    uint64 `json:"iotick"`
}

func (d *DiskUtilization) diff(base *DiskUtilization) DiskUtilization {
	return DiskUtilization{
		Name:       d.Name,
		ReadBytes:  d.ReadBytes - base.ReadBytes,
		ReadTicks:  d.ReadTicks - base.ReadTicks,
		WriteBytes: d.WriteBytes - base.WriteBytes,
		WriteTicks: d.WriteTicks - base.WriteTicks,
		IoTicks:    d.IoTicks - base.IoTicks,
	}
}

type DiskStat struct {
	Time  time.Time         `json:"time"`
	Disks []DiskUtilization `json:"disks"`
}

type NetworkUtilization struct {
	Name string `json:"name"`
	Rx   uint64 `json:"rx"`
	Tx   uint64 `json:"tx"`
}

func (n *NetworkUtilization) diff(base *NetworkUtilization) NetworkUtilization {
	return NetworkUtilization{
		Name: n.Name,
		Rx:   n.Rx - base.Rx,
		Tx:   n.Tx - base.Tx,
	}
}

type NetworkStat struct {
	Time     time.Time            `json:"time"`
	Networks []NetworkUtilization `json:"networks"`
}

var (
	splitSpace    = regexp.MustCompile(`\s+`)
	coreMatcher   = regexp.MustCompile(`cpu\d+`)
	cpuMHzMatcher = regexp.MustCompile(`^cpu MHz.*: ([\d\.]+)$`)

	lastCpuValue     = map[string]CpuUtilization{}
	lastDiskValue    = map[string]DiskUtilization{}
	lastNetworkValue = map[string]NetworkUtilization{}
)

func parseCpuLine(tag string, values []string) (*CpuUtilization, error) {
	var nv []uint64
	for _, v := range values {
		n, err := strconv.ParseUint(v, 10, 64)
		if err != nil {
			return nil, errors.WithMessagef(err, "Failed to parse %s: [%s]", tag, v)
		}
		nv = append(nv, n)
	}

	return &CpuUtilization{
		Name:      tag,
		User:      nv[0],
		Nice:      nv[1],
		System:    nv[2],
		Idle:      nv[3],
		IoWait:    nv[4],
		Irq:       nv[5],
		Softirq:   nv[6],
		Steal:     nv[7],
		Guest:     nv[8],
		GuestNice: nv[9],
	}, nil
}

func parseProcStat(cpuStat *CpuStat) error {
	// $ cat /proc/stat
	// cpu  960432 448 275417 21572053 9485 0 3117 0 0 0
	// cpu0 118609 55 32166 2702551 1246 0 89 0 0 0
	// cpu1 126437 4 30948 2698775 1113 0 49 0 0 0
	// ...
	// procs_running 8
	// procs_blocked 0
	// ...
	cpuStatFile, err := os.Open("/proc/stat")
	if err != nil {
		return errors.WithStack(err)
	}
	defer cpuStatFile.Close()
	reader := bufio.NewReader(cpuStatFile)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return errors.WithStack(err)
		}
		line = strings.TrimRight(line, "\n")
		tagValues := splitSpace.Split(line, -1)
		tag := tagValues[0]
		values := tagValues[1:]
		switch {
		case tag == "cpu":
			all, err := parseCpuLine(tag, values)
			if err != nil {
				return err
			}
			last := lastCpuValue[tag]
			diff := all.diff(&last)
			lastCpuValue[tag] = *all
			cpuStat.All = diff
		case coreMatcher.Match([]byte(tag)):
			core, err := parseCpuLine(tag, values)
			if err != nil {
				return err
			}
			last := lastCpuValue[tag]
			diff := core.diff(&last)
			lastCpuValue[tag] = *core
			cpuStat.Cores = append(cpuStat.Cores, diff)
		case tag == "procs_running":
			r, err := strconv.ParseUint(values[0], 10, 64)
			if err != nil {
				return errors.WithStack(err)
			}
			cpuStat.Running = r
		case tag == "procs_blocked":
			b, err := strconv.ParseUint(values[0], 10, 64)
			if err != nil {
				return errors.WithStack(err)
			}
			cpuStat.Blocked = b
		}
	}
	return nil
}

func parseProcCpuInfo(cpuStat *CpuStat) error {
	cpuInfoFile, err := os.Open("/proc/cpuinfo")
	if err != nil {
		return errors.WithStack(err)
	}
	defer cpuInfoFile.Close()
	reader := bufio.NewReader(cpuInfoFile)
	coreNum := len(cpuStat.Cores)
	var totalClock uint64
	for i := 0; i < coreNum; {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return errors.WithStack(err)
		}
		line = strings.TrimRight(line, "\n")
		cpuMHzBytes := cpuMHzMatcher.FindSubmatch([]byte(line))
		if cpuMHzBytes == nil {
			continue
		}
		clockBytes := cpuMHzBytes[1]
		dotIndex := bytes.Index(clockBytes, []byte{'.'})
		cpuMHz, err := strconv.ParseUint(string(clockBytes[0:dotIndex])+string(clockBytes[dotIndex+1:]), 10, 64)
		if err != nil {
			return errors.WithStack(err)
		}
		cpuStat.Cores[i].Clock = cpuMHz
		totalClock += cpuMHz
		i++
	}
	cpuStat.All.Clock = totalClock / uint64(coreNum)
	return nil
}

func (c *Cpu) Execute() (interface{}, error) {
	cpuStat := CpuStat{
		Time: time.Now(),
	}
	if err := parseProcStat(&cpuStat); err != nil {
		return nil, err
	}
	if err := parseProcCpuInfo(&cpuStat); err != nil {
		return nil, err
	}
	return cpuStat, nil
}

func (m *Memory) Execute() (interface{}, error) {
	out, err := exec.Command("free", "-w").Output()
	if err != nil {
		return nil, errors.WithStack(err)
	}
	buf := bytes.NewBuffer(out)
	buf.ReadString('\n') // Drop title line
	mem, _ := buf.ReadString('\n')
	values := splitSpace.Split(mem, -1)
	total, _ := strconv.ParseUint(values[1], 10, 64)
	used, _ := strconv.ParseUint(values[2], 10, 64)
	free, _ := strconv.ParseUint(values[3], 10, 64)
	shared, _ := strconv.ParseUint(values[4], 10, 64)
	buffers, _ := strconv.ParseUint(values[5], 10, 64)
	cache, _ := strconv.ParseUint(values[6], 10, 64)
	available, _ := strconv.ParseUint(values[7], 10, 64)
	memStat := MemoryStat{
		Time:      time.Now(),
		Total:     total,
		Used:      used,
		Free:      free,
		Shared:    shared,
		Buffers:   buffers,
		Cache:     cache,
		Available: available,
	}
	return memStat, nil
}

func parseSysClassBlockStat(name string, du *DiskUtilization) error {
	blockStatFile, err := os.Open(fmt.Sprintf("/sys/class/block/%s/stat", name))
	if err != nil {
		return errors.WithStack(err)
	}
	defer blockStatFile.Close()
	reader := bufio.NewReader(blockStatFile)
	line, err := reader.ReadString('\n')
	if err != nil {
		return errors.WithStack(err)
	}
	values := splitSpace.Split(line, -1)
	readSectors, _ := strconv.ParseUint(values[2], 10, 64)
	readTicks, _ := strconv.ParseUint(values[3], 10, 64)
	writeSectors, _ := strconv.ParseUint(values[6], 10, 64)
	writeTicks, _ := strconv.ParseUint(values[7], 10, 64)
	ioTicks, _ := strconv.ParseUint(values[9], 10, 64)
	du.Name = name
	du.ReadBytes = readSectors * 512
	du.ReadTicks = readTicks
	du.WriteBytes = writeSectors * 512
	du.WriteTicks = writeTicks
	du.IoTicks = ioTicks
	return nil
}

func (m *Disk) Execute() (interface{}, error) {
	dirs, err := ioutil.ReadDir("/sys/class/block")
	if err != nil {
		return nil, errors.WithStack(err)
	}
	diskStat := DiskStat{
		Time: time.Now(),
	}
	for _, d := range dirs {
		du := DiskUtilization{}
		err := parseSysClassBlockStat(d.Name(), &du)
		if err != nil {
			return nil, errors.WithStack(err)
		}
		last := lastDiskValue[d.Name()]
		diff := du.diff(&last)
		lastDiskValue[d.Name()] = du
		diskStat.Disks = append(diskStat.Disks, diff)
	}
	return diskStat, nil
}

func parseNetworkBytesFile(path string) (uint64, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, errors.WithStack(err)
	}
	defer file.Close()
	buf := make([]byte, 21) // max 20 digits + '\n'
	r, err := file.Read(buf)
	if err != nil {
		return 0, errors.WithStack(err)
	}
	return strconv.ParseUint(string(buf[0:r-1]), 10, 64)
}

func parseNetRxTx(name string, nu *NetworkUtilization) error {
	rx, err := parseNetworkBytesFile(fmt.Sprintf("/sys/class/net/%s/statistics/rx_bytes", name))
	if err != nil {
		return errors.WithStack(err)
	}
	tx, err := parseNetworkBytesFile(fmt.Sprintf("/sys/class/net/%s/statistics/tx_bytes", name))
	if err != nil {
		return errors.WithStack(err)
	}
	nu.Name = name
	nu.Rx = rx
	nu.Tx = tx
	return nil
}

func (m *Network) Execute() (interface{}, error) {
	dirs, err := ioutil.ReadDir("/sys/class/net")
	if err != nil {
		return nil, errors.WithStack(err)
	}
	netStat := NetworkStat{
		Time: time.Now(),
	}
	for _, d := range dirs {
		nu := NetworkUtilization{}
		err := parseNetRxTx(d.Name(), &nu)
		if err != nil {
			return nil, errors.WithStack(err)
		}
		last := lastNetworkValue[d.Name()]
		diff := nu.diff(&last)
		lastNetworkValue[d.Name()] = nu
		netStat.Networks = append(netStat.Networks, diff)
	}
	return netStat, nil
}
